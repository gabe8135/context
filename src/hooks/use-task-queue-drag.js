"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "archived"]);
const EDGE_SIZE = 96;
const MAX_SCROLL_SPEED = 18;

function queued(tasks) {
  return tasks.filter((task) => !TERMINAL_STATUSES.has(task.status));
}

function animateLayout(previousPositions) {
  requestAnimationFrame(() => {
    document.querySelectorAll("[data-task-id]").forEach((element) => {
      const previous = previousPositions.get(element.dataset.taskId);
      if (!previous) return;
      const current = element.getBoundingClientRect();
      const deltaY = previous.top - current.top;
      if (Math.abs(deltaY) < 1) return;
      element.animate(
        [{ transform: `translateY(${deltaY}px)` }, { transform: "translateY(0)" }],
        { duration: 190, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    });
  });
}

function capturePositions() {
  return new Map([...document.querySelectorAll("[data-task-id]")]
    .map((element) => [element.dataset.taskId, element.getBoundingClientRect()]));
}

export function useTaskQueueDrag({ tasks, setTasks, onCommit }) {
  const tasksRef = useRef(tasks);
  const draggedIdRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(null);
  const commitRef = useRef(onCommit);
  const [draggedId, setDraggedId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { commitRef.current = onCommit; }, [onCommit]);
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const reorderAtPoint = useCallback((x, y) => {
    const activeId = draggedIdRef.current;
    if (!activeId) return;
    const target = document.elementFromPoint(x, y)?.closest("[data-task-id]");
    const targetId = target?.dataset.taskId;
    if (!targetId || targetId === activeId) {
      setDropTargetId(null);
      return;
    }

    const items = tasksRef.current;
    const activeTasks = queued(items);
    const from = activeTasks.findIndex((item) => item.id === activeId);
    const to = activeTasks.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;

    setDropTargetId(targetId);
    if (from === to) return;
    const previousPositions = capturePositions();
    const reordered = [...activeTasks];
    const [moving] = reordered.splice(from, 1);
    reordered.splice(to, 0, moving);
    const next = [...reordered, ...items.filter((item) => TERMINAL_STATUSES.has(item.status))];
    tasksRef.current = next;
    setTasks(next);
    animateLayout(previousPositions);
  }, [setTasks]);

  function autoScroll() {
    if (!draggedIdRef.current) return;
    const { x, y } = pointerRef.current;
    const height = window.innerHeight;
    let speed = 0;
    if (y < EDGE_SIZE) speed = -MAX_SCROLL_SPEED * (1 - Math.max(0, y) / EDGE_SIZE);
    else if (y > height - EDGE_SIZE) speed = MAX_SCROLL_SPEED * (1 - Math.max(0, height - y) / EDGE_SIZE);
    if (speed) {
      window.scrollBy(0, speed);
      reorderAtPoint(x, y);
    }
    frameRef.current = requestAnimationFrame(autoScroll);
  }

  function startDrag(event, taskId) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { x: event.clientX, y: event.clientY };
    draggedIdRef.current = taskId;
    setDraggedId(taskId);
    document.documentElement.classList.add("task-queue-dragging");
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(autoScroll);
  }

  function moveDrag(event) {
    if (!draggedIdRef.current) return;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    reorderAtPoint(event.clientX, event.clientY);
  }

  function finishDrag() {
    if (!draggedIdRef.current) return;
    const orderedIds = queued(tasksRef.current).map((item) => item.id);
    draggedIdRef.current = null;
    setDraggedId(null);
    setDropTargetId(null);
    document.documentElement.classList.remove("task-queue-dragging");
    cancelAnimationFrame(frameRef.current);
    if (orderedIds.length) commitRef.current(orderedIds);
  }

  return { draggedId, dropTargetId, startDrag, moveDrag, finishDrag };
}
