import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { login, signup, resendConfirmation } from "./actions";

export default async function Login({ searchParams }) {
  const query = await searchParams;
  return <main>
    <nav className="landing-nav">
      <Link href="/" className="brand" style={{color:"var(--ink)",padding:0,textDecoration:"none"}}>
        <span className="brand-mark"><BrainCircuit size={17}/></span>Contexto
      </Link>
    </nav>
    <div className="login-card">
      <div className="eyebrow">Acesse seu espaço</div>
      <h1>Seu contexto está aqui.</h1>
      <p className="subtitle">Entre ou crie uma conta para começar.</p>
      {query.erro && <p className="error">{query.erro}</p>}
      {query.mensagem && <p className="badge" style={{marginTop:16}}>{query.mensagem}</p>}
      <form>
        <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required autoComplete="email"/></div>
        <div className="field"><label htmlFor="password">Senha</label><input id="password" name="password" type="password" minLength="8" required autoComplete="current-password"/></div>
        <div className="actions"><button className="btn primary" formAction={login}>Entrar</button><button className="btn" formAction={signup}>Criar conta</button><button className="btn" formAction={resendConfirmation} formNoValidate>Reenviar confirmação</button></div>
      </form>
      <p className="meta">Sua conta e seus dados ficam protegidos pelo Supabase e pelas políticas de acesso do workspace.</p>
      <p className="meta"><Link href="/recuperar-senha">Esqueci minha senha</Link></p>
    </div>
  </main>;
}
