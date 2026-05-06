import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Heart, Send, X, Menu, ShieldCheck, Sparkles, Loader2, CheckCircle2, ClipboardList, Search, HandHeart, Eye, Zap } from "lucide-react";
import logo from "@/assets/connectcare-logo.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "ConnectCare — Doe para ONGs regulamentadas" },
      {
        name: "description",
        content:
          "Converse com nosso assistente e descubra ONGs regulamentadas para fazer sua doação com segurança.",
      },
    ],
  }),
});

const WEBHOOK_URL =
  "https://hook.us2.make.com/wuyc6tpiabufqfci06i4toat6vnb33qa";

type Donation = "" | "Roupa" | "Roupas de frio" | "Cobertores" | "Calçados" | "Alimentos";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const DONATIONS = ["Roupa", "Roupas de frio", "Cobertores", "Calçados", "Alimentos"];

function Index() {
  const [showForm, setShowForm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string>("");
  const [ongs, setOngs] = useState<Array<{ name?: string; phone?: string; cnpj?: string; address?: string; days?: string; hours?: string }>>([]);
  const [hasResponse, setHasResponse] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [uf, setUf] = useState("");
  const [city, setCity] = useState("");
  const [cep, setCep] = useState("");
  const [donationType, setDonationType] = useState<Donation>("");
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (!uf) { setCities([]); setCity(""); return; }
    setLoadingCities(true);
    setCity("");
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      .then((r) => r.json())
      .then((data: Array<{ nome: string }>) => setCities(data.map((c) => c.nome)))
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false));
  }, [uf]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setHasResponse(false);

    const name = firstName.trim().slice(0, 60);
    const cityT = city.trim().slice(0, 80);
    const cepT = cep.trim().slice(0, 9);

    if (!name || !uf || !cityT || !cepT || !donationType) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    if (!/^\d{5}-?\d{3}$/.test(cepT)) {
      setError("CEP inválido. Use o formato 00000-000.");
      return;
    }

    setLoading(true);
    setResponseText("");
    setOngs([]);
    setHasResponse(false);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: name,
          uf,
          city: cityT,
          cep: cepT,
          donationType,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Falha no envio");

      const raw = await res.text();
      let payload: any = {};
      try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }

      const text: string = typeof payload?.Gemini === "string" ? payload.Gemini : "";

      let arr: any = payload?.Array;
      if (typeof arr === "string") {
        const s = arr.trim();
        const tryParse = (v: string) => { try { return JSON.parse(v); } catch { return undefined; } };
        let parsed: any = tryParse(s);
        if (parsed === undefined && s) {
          // Webhook may send "{...}, {...}" — wrap into a JSON array
          parsed = tryParse(`[${s}]`);
        }
        arr = parsed ?? null;
      }

      const mapOng = (o: any) => ({
        name: o?.["4"],
        phone: o?.["5"],
        cnpj: o?.["10"],
        address: o?.["22"],
        days: o?.["23"],
        hours: o?.["31"],
      });

      let list: any[] = [];
      if (Array.isArray(arr)) {
        list = arr.map(mapOng);
      } else if (arr && typeof arr === "object") {
        // Could be a single ONG ({"4":..,"5":..}) or a map of ONGs ({"1":{..},"2":{..}})
        const values = Object.values(arr);
        const allObjects = values.length > 0 && values.every((v) => v && typeof v === "object");
        if (allObjects) {
          list = (values as any[]).map(mapOng);
        } else {
          list = [mapOng(arr)];
        }
      }

      list = list.filter((o) => o.name || o.phone || o.address).slice(0, 5);

      setResponseText(text);
      setOngs(list);
      setHasResponse(true);
      setFirstName(""); setUf(""); setCity(""); setCep(""); setDonationType("");
    } catch {
      setError("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="#sobre" aria-label="Ir para o início" className="flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40">
            <img src={logo} alt="ConnectCare" className="h-10 md:h-12 w-auto" />
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#como-funciona" className="hover:text-foreground transition">Como funciona</a>
            <a href="#chat" className="hover:text-foreground transition">Buscar ONGs</a>
            <a href="#por-que-doar" className="hover:text-foreground transition">Por que doar</a>
            <a href="#pilares" className="hover:text-foreground transition">Pilares</a>
            
            <Button
              onClick={() => setShowForm(true)}
              className="rounded-full px-5"
              style={{ background: "var(--gradient-brand)", color: "white" }}
            >
              <Heart className="w-4 h-4 mr-2" /> Cadastrar ONG
            </Button>
          </nav>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-border/60 px-4 py-3 flex flex-col gap-3 bg-background/95">
            <a href="#como-funciona" onClick={() => setMenuOpen(false)} className="text-sm">Como funciona</a>
            <a href="#chat" onClick={() => setMenuOpen(false)} className="text-sm">Buscar ONGs</a>
            <a href="#por-que-doar" onClick={() => setMenuOpen(false)} className="text-sm">Por que doar</a>
            <a href="#pilares" onClick={() => setMenuOpen(false)} className="text-sm">Pilares</a>
            
            <Button
              onClick={() => { setShowForm(true); setMenuOpen(false); }}
              className="rounded-full"
              style={{ background: "var(--gradient-brand)", color: "white" }}
            >
              <Heart className="w-4 h-4 mr-2" /> Cadastrar ONG
            </Button>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        {/* Hero */}
        <section id="sobre" className="scroll-mt-24 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Doação consciente, conexão real
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Conectando corações a quem mais{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              precisa
            </span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            Doar é mais do que ajudar — é transformar histórias. Cada gesto sustenta projetos
            que cuidam de pessoas, animais e do nosso planeta. Aqui você conversa com nosso
            assistente e descobre, com segurança, ONGs alinhadas à sua causa.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-secondary-foreground bg-secondary/40 px-4 py-2 rounded-full">
            <ShieldCheck className="w-4 h-4" />
            Apenas ONGs <strong className="font-semibold">regulamentadas</strong> são cadastradas em nossa rede.
          </div>
        </section>
        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-24 mt-12 md:mt-16">
          <div className="max-w-2xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/40 text-xs font-medium text-foreground mb-4">
              <ClipboardList className="w-3.5 h-3.5" /> Passo a passo
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
              Como{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                funciona
              </span>
            </h2>
            <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
              Em apenas 3 passos você conecta sua doação a quem realmente precisa.
            </p>
          </div>

          <div className="relative">
            {/* linha conectora */}
            <div
              aria-hidden
              className="hidden md:block absolute top-6 left-[8%] right-[8%] h-px"
              style={{ background: "var(--gradient-brand)", opacity: 0.35 }}
            />
            <ol className="grid md:grid-cols-3 gap-10 md:gap-6 relative">
              {[
                {
                  icon: ClipboardList,
                  step: "01",
                  title: "Preencha seus dados",
                  text: "Informe seu nome, localização e o tipo de doação que deseja realizar.",
                },
                {
                  icon: Search,
                  step: "02",
                  title: "Encontramos ONGs",
                  text: "Nosso assistente busca ONGs regulamentadas próximas e alinhadas à sua doação.",
                },
                {
                  icon: HandHeart,
                  step: "03",
                  title: "Doe com propósito",
                  text: "Entre em contato com a ONG escolhida e entregue sua doação com segurança.",
                },
              ].map(({ icon: Icon, step, title, text }) => (
                <li key={step} className="relative flex flex-col items-start group">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md ring-4 ring-background relative z-10"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className="mt-4 text-xs font-semibold tracking-[0.2em] bg-clip-text text-transparent"
                    style={{ backgroundImage: "var(--gradient-brand)" }}
                  >
                    PASSO {step}
                  </span>
                  <h3 className="mt-1 text-lg md:text-xl font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">
                    {text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Chat */}
        <section id="chat" className="scroll-mt-24 mt-12 md:mt-16">
          <div
            className="rounded-3xl bg-card border border-border/60 overflow-hidden"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div
              className="px-6 py-4 flex items-center gap-3 border-b border-border/60"
              style={{ background: "var(--gradient-brand)" }}
            >
              <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <div className="text-white">
                <div className="font-semibold leading-tight">Quero doar</div>
                <div className="text-xs text-white/80">Preencha seus dados e o tipo de doação</div>
              </div>
            </div>

            <form onSubmit={submit} className="p-5 md:p-7 space-y-4 bg-card">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Primeiro nome</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={60}
                  placeholder="Ex: Maria"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">UF</label>
                  <select
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Selecione</option>
                    {UFS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Cidade</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!uf || loadingCities}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                  >
                    <option value="">
                      {!uf ? "Selecione a UF primeiro" : loadingCities ? "Carregando..." : "Selecione"}
                    </option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">CEP</label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    maxLength={9}
                    placeholder="00000-000"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Tipo de doação</label>
                  <select
                    value={donationType}
                    onChange={(e) => setDonationType(e.target.value as Donation)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Selecione</option>
                    {DONATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
              {hasResponse && (
                <div className="space-y-4">
                  <div className="text-sm text-foreground bg-secondary/40 border border-border rounded-xl px-4 py-3 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="whitespace-pre-line leading-relaxed">
                      {responseText || "Recebemos seus dados! Em breve entraremos em contato."}
                    </p>
                  </div>

                  {ongs.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">
                        ONGs encontradas ({ongs.length})
                      </h4>
                      {ongs.map((o, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-border bg-background p-4 space-y-1.5"
                          style={{ boxShadow: "var(--shadow-soft)" }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ background: "var(--gradient-brand)" }}
                            >
                              {i + 1}
                            </div>
                            <div className="font-semibold text-foreground text-sm">
                              {o.name || "ONG"}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1 pl-9">
                            {o.phone && <div><strong className="text-foreground">Telefone:</strong> {o.phone}</div>}
                            {o.cnpj && <div><strong className="text-foreground">CNPJ:</strong> {o.cnpj}</div>}
                            {o.address && <div><strong className="text-foreground">Endereço:</strong> {o.address}</div>}
                            {o.days && <div><strong className="text-foreground">Dias:</strong> {o.days}</div>}
                            {o.hours && <div><strong className="text-foreground">Horário:</strong> {o.hours}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted/40 border border-border rounded-xl px-4 py-3">
                      Nenhuma ONG encontrada no momento para os critérios informados.
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl h-12 text-base font-semibold"
                style={{ background: "var(--gradient-brand)", color: "white" }}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Enviar</>
                )}
              </Button>
            </form>
          </div>
        </section>

        {/* Info */}
        <section id="regulamentadas" className="scroll-mt-24 mt-16 grid md:grid-cols-3 gap-5">
          {[
            {
              icon: HandHeart,
              title: "Impacto direto",
              text: "Sua doação vai direto a quem precisa, sem intermediários — você acompanha de perto a transformação que ajudou a criar.",
            },
            {
              icon: ShieldCheck,
              title: "ONGs verificadas",
              text: "Trabalhamos exclusivamente com organizações regulamentadas, com CNPJ ativo e estatuto válido.",
            },
            {
              icon: Search,
              title: "Busca por região",
              text: "Encontramos ONGs próximas de você, considerando sua cidade e estado para uma doação prática e local.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl bg-card border border-border/60 p-6"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "var(--gradient-brand)" }}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </section>

        {/* Por que doar */}
        <section id="por-que-doar" className="scroll-mt-24 mt-16 md:mt-20">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-start">
            <div className="md:col-span-5 md:sticky md:top-24">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/40 text-xs font-medium text-foreground mb-4">
                <Heart className="w-3.5 h-3.5" /> Propósito
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
                Por que{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-brand)" }}
                >
                  doar?
                </span>
              </h2>
              <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                Doar não é apenas dar — é reconhecer que o que sobra para nós pode ser tudo
                para alguém. É um gesto que carrega afeto, atravessa histórias e devolve
                dignidade onde ela faltava.
              </p>
            </div>

            <ol className="md:col-span-7 divide-y divide-border/60">
              {[
                {
                  icon: Heart,
                  title: "Transforma vidas",
                  text: "Cada peça de roupa, alimento ou cobertor doado representa acolhimento, saúde e dignidade para quem mais precisa.",
                },
                {
                  icon: Sparkles,
                  title: "Fortalece comunidades",
                  text: "Apoiar ONGs locais sustenta projetos contínuos de educação, assistência e cidadania nos bairros que mais precisam.",
                },
                {
                  icon: ShieldCheck,
                  title: "Reduz desperdício",
                  text: "O que não usamos mais pode ser essencial para outra família. Doar é dar um novo propósito ao que já existe.",
                },
              ].map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex gap-5 py-6 first:pt-0 last:pb-0 group">
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <span
                      className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent tabular-nums"
                      style={{ backgroundImage: "var(--gradient-brand)" }}
                    >
                      0{i + 1}
                    </span>
                    <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition" />
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1.5">
                      {title}
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                      {text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Nossos Pilares */}
        <section id="pilares" className="scroll-mt-24 mt-16 md:mt-20">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-start">
            <div className="md:col-span-5 md:sticky md:top-24">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Nossos valores
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
                Nossos{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-brand)" }}
                >
                  Pilares
                </span>
              </h2>
              <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                Os princípios que sustentam cada conexão feita pela ConnectCare —
                guiando como nos relacionamos com doadores, ONGs e com cada história envolvida.
              </p>
            </div>

            <dl className="md:col-span-7 space-y-8">
              {[
                {
                  icon: Eye,
                  title: "Transparência",
                  text: "Mostramos com clareza quem são as ONGs, como atuam e o destino de cada doação — sem letras miúdas.",
                },
                {
                  icon: Zap,
                  title: "Agilidade",
                  text: "Conexões rápidas entre você e a ONG certa, para que a ajuda chegue no momento em que mais importa.",
                },
                {
                  icon: HandHeart,
                  title: "Comprometimento",
                  text: "Cuidamos de cada cadastro, cada conversa e cada doação como se fosse nossa — com responsabilidade real.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="group relative pl-6 border-l-2 border-border/60 hover:border-transparent transition"
                >
                  <span
                    aria-hidden
                    className="absolute left-[-2px] top-0 h-full w-0.5 origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-500"
                    style={{ background: "var(--gradient-brand)" }}
                  />
                  <dt className="flex items-center gap-3 mb-2">
                    <Icon
                      className="w-5 h-5 bg-clip-text text-transparent"
                      style={{ color: "transparent", stroke: "url(#pilar-grad)" }}
                    />
                    <span className="text-xl md:text-2xl font-semibold text-foreground">
                      {title}
                    </span>
                  </dt>
                  <dd className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {text}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          {/* svg defs para gradiente nos ícones */}
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="pilar-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.09 230)" />
                <stop offset="100%" stopColor="oklch(0.82 0.1 160)" />
              </linearGradient>
            </defs>
          </svg>
        </section>

        <footer className="mt-16 py-8 text-center text-xs text-muted-foreground border-t border-border/60">
          © {new Date().getFullYear()} ConnectCare — Doação com propósito e transparência.
        </footer>
      </main>

      {/* Modal Iframe */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-md animate-in fade-in"
          onClick={() => setShowForm(false)}
        >
          <div
            className="relative bg-card rounded-3xl overflow-hidden w-full max-w-md h-[85vh] max-h-[720px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowForm(false)}
              aria-label="Fechar"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-background/90 hover:bg-background border border-border flex items-center justify-center transition shadow-md"
            >
              <X className="w-4 h-4" />
            </button>
            <iframe
              src="https://tally.so/r/7R4N0P"
              title="Cadastro de ONG"
              className="w-full h-full border-0"
              allow="clipboard-write"
            />
          </div>
        </div>
      )}
    </div>
  );
}
