"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "archived"]);
const EDGE_SIZE = 96;
const MAX_SCROLL_SPEED = 18;
const layoutAnimations = new WeakMap();

function queued(tasks) {
  return tasks.filter((task) => !TERMINAL_STATUSES.has(task.status));
}

function animateLayout(previousPositions) {
  requestAnimationFrame(() => {
    document.querySelectorAll("[data-task-id]").forEach((element) => {
      if (element.classList.contains("is-dragging")) return;
      const previous = previousPositions.get(element.dataset.taskId);
      if (!previous) return;
      const current = element.getBoundingClientRect();
      const deltaY = previous.top - current.top;
      if (Math.abs(deltaY) < 1) return;
      layoutAnimations.get(element)?.cancel();
      const animation = element.animate(
        [
          { transform: `translate3d(0,${deltaY}px,0) scale(.992)`, offset: 0 },
          { transform: "translate3d(0,-2px,0) scale(1.002)", offset: .72 },
          { transform: "translate3d(0,0,0) scale(1)", offset: 1 },
        ],
        { duration: 360, easing: "cubic-bezier(.16,1,.3,1)" },
      );
      layoutAnimations.set(element, animation);
      animation.addEventListener("finish", () => layoutAnimations.delete(element), { once: true });
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
  const captureRef = useRef({ element: null, pointerId: null });
  const pointerRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(null);
  const commitRef = useRef(onCommit);
  const [draggedId, setDraggedId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { commitRef.current = onCommit; }, [onCommit]);
  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current);
    document.documentElement.classList.remove("task-queue-dragging");
  }, []);

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
    captureRef.current = { element: event.currentTarget, pointerId: event.pointerId };
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
    const { element, pointerId } = captureRef.current;
    draggedIdRef.current = null;
    captureRef.current = { element: null, pointerId: null };
    if (element && pointerId != null && element.hasPointerCapture?.(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
    setDraggedId(null);
    setDropTargetId(null);
    document.documentElement.classList.remove("task-queue-dragging");
    cancelAnimationFrame(frameRef.current);
    if (orderedIds.length) commitRef.current(orderedIds);
  }

  useEffect(() => {
    if (!draggedId) return;
    const release = () => finishDrag();
    const releaseWhenHidden = () => document.hidden && finishDrag();
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", release, true);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", releaseWhenHidden);
    return () => {
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", releaseWhenHidden);
    };
  }, [draggedId]);

  return { draggedId, dropTargetId, startDrag, moveDrag, finishDrag };
}
