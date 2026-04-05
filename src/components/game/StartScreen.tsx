import { useState } from "react";
import huffHomeUrl from "@/assets/game/huff-home.png";
import { HomeGameBackground } from "./HomeGameBackground";
import { getFanByWhatsApp, createFan, updateFanProfile, deleteFan, getTopFans, type Fan } from "@/lib/firestore";
import { Pencil, Trophy } from "lucide-react";

interface StartScreenProps {
  onStart: (fan: Fan) => void;
  topFans: Fan[];
  loadingFans: boolean;
}

type Step = "whatsapp" | "register" | "existing" | "edit";

function formatWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const StartScreen = ({ onStart, topFans, loadingFans }: StartScreenProps) => {
  const [step, setStep] = useState<Step>("whatsapp");
  const [whatsappDisplay, setWhatsappDisplay] = useState("");
  const [nome, setNome] = useState("");
  const [instagram, setInstagram] = useState("");
  const [editNome, setEditNome] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [existingFan, setExistingFan] = useState<Fan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const whatsappDigits = whatsappDisplay.replace(/\D/g, "");
  const whatsappValid = whatsappDigits.length >= 10;

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsappDisplay(formatWhatsApp(e.target.value));
    setError("");
  };

  const handleContinuar = async () => {
    if (!whatsappValid) return;
    setLoading(true);
    setError("");
    try {
      const fan = await getFanByWhatsApp(whatsappDigits);
      if (fan) {
        setExistingFan(fan);
        setStep("existing");
      } else {
        setStep("register");
      }
    } catch (err: unknown) {
      console.error("[Firestore] getFanByWhatsApp:", err);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("permissions") || msg.includes("permission")) {
        setError("Permissão negada no banco de dados. Contate o suporte.");
      } else {
        setError("Erro ao conectar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCadastrar = async () => {
    if (!nome.trim()) return;
    setLoading(true);
    setError("");
    try {
      const fan = await createFan({
        nome,
        whatsapp: whatsappDigits,
        instagram: instagram.replace(/^@/, ""),
      });
      onStart(fan);
    } catch {
      setError("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarEdicao = async () => {
    if (!editNome.trim() || !existingFan) return;
    setLoading(true);
    setError("");
    try {
      await updateFanProfile(existingFan.whatsapp, {
        nome: editNome,
        instagram: editInstagram.replace(/^@/, ""),
      });
      const updated: Fan = {
        ...existingFan,
        nome: editNome.trim(),
        instagram: editInstagram.replace(/^@/, "").trim(),
      };
      setExistingFan(updated);
      setStep("existing");
    } catch {
      setError("Erro ao salvar alterações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirConta = async () => {
    if (!existingFan) return;
    setLoading(true);
    setError("");
    try {
      await deleteFan(existingFan.whatsapp);
      setStep("whatsapp");
      setWhatsappDisplay("");
      setExistingFan(null);
      setConfirmDelete(false);
    } catch {
      setError("Erro ao excluir conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") action();
  };

  const inputClass =
    "w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground text-left text-lg focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <HomeGameBackground />
      <div className="absolute inset-0 z-[1] bg-background/70 backdrop-blur-sm" aria-hidden />

      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center p-4">
        <img
          src={huffHomeUrl}
          alt="Jump Dash Quest"
          className="mb-8 w-full max-w-md md:max-w-lg object-contain select-none"
          draggable={false}
        />

        <div className="w-full max-w-xs space-y-3">

          {/* ── STEP: WHATSAPP ───────────────────────────────────────── */}
          {step === "whatsapp" && (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Digite seu WhatsApp para entrar
              </p>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="(11) 99999-0000"
                value={whatsappDisplay}
                onChange={handleWhatsAppChange}
                onKeyDown={(e) => handleKeyDown(e, handleContinuar)}
                autoFocus
                className={inputClass}
              />
              {error && <p className="text-center text-xs text-destructive">{error}</p>}
              <button
                onClick={handleContinuar}
                disabled={!whatsappValid || loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-lg transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                style={{ boxShadow: whatsappValid ? "0 0 20px hsl(199 78% 72% / 0.45)" : "none" }}
              >
                {loading ? "Verificando…" : "Continuar"}
              </button>
            </>
          )}

          {/* ── STEP: FÃ EXISTENTE ───────────────────────────────────── */}
          {step === "existing" && existingFan && (
            <>
              <div className="rounded-xl border border-border bg-muted/60 px-4 py-4 text-center space-y-1">
                <p className="text-lg font-bold text-foreground">
                  Olá, {existingFan.nome}
                </p>
                {existingFan.instagram && (
                  <p className="text-xs text-muted-foreground">@{existingFan.instagram}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Melhor pontuação:{" "}
                  <span className="font-mono font-bold text-primary">
                    {existingFan.maiorPontuacao}
                  </span>
                </p>
              </div>
              <button
                onClick={() => onStart(existingFan)}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-lg transition-all hover:scale-105"
                style={{ boxShadow: "0 0 20px hsl(199 78% 72% / 0.45)" }}
              >
                JOGAR!
              </button>
              <button
                onClick={() => {
                  setEditNome(existingFan.nome);
                  setEditInstagram(existingFan.instagram ?? "");
                  setError("");
                  setConfirmDelete(false);
                  setStep("edit");
                }}
                className="w-full py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                Editar dados
              </button>
              <button
                onClick={() => { setStep("whatsapp"); setWhatsappDisplay(""); setExistingFan(null); }}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Não sou eu
              </button>
            </>
          )}

          {/* ── STEP: EDITAR ─────────────────────────────────────────── */}
          {step === "edit" && existingFan && (
            <>
              <p className="text-center text-sm text-muted-foreground">Editar dados</p>

              <input
                type="text"
                placeholder="Seu nome *"
                value={editNome}
                onChange={(e) => { setEditNome(e.target.value); setError(""); }}
                onKeyDown={(e) => handleKeyDown(e, handleSalvarEdicao)}
                maxLength={30}
                autoFocus
                className={inputClass}
              />
              <div className="relative w-full">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground select-none pointer-events-none">
                  @
                </span>
                <input
                  type="text"
                  placeholder="instagram (opcional)"
                  value={editInstagram}
                  onChange={(e) => setEditInstagram(e.target.value.replace(/^@+/, ""))}
                  onKeyDown={(e) => handleKeyDown(e, handleSalvarEdicao)}
                  maxLength={30}
                  className="w-full pl-9 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground text-left text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {error && <p className="text-center text-xs text-destructive">{error}</p>}

              <button
                onClick={handleSalvarEdicao}
                disabled={!editNome.trim() || loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-lg transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                style={{ boxShadow: editNome.trim() ? "0 0 20px hsl(199 78% 72% / 0.45)" : "none" }}
              >
                {loading ? "Salvando…" : "Salvar"}
              </button>

              {/* Excluir conta */}
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2 text-xs text-destructive/70 hover:text-destructive transition-colors"
                >
                  Excluir conta
                </button>
              ) : (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-2">
                  <p className="text-center text-xs text-destructive font-medium">
                    Tem certeza? Essa ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleExcluirConta}
                      disabled={loading}
                      className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40"
                    >
                      {loading ? "Excluindo…" : "Sim, excluir"}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setStep("existing"); setError(""); setConfirmDelete(false); }}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Voltar
              </button>
            </>
          )}

          {/* ── STEP: CADASTRO ───────────────────────────────────────── */}
          {step === "register" && (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Bem-vindo! Complete seu cadastro:
              </p>
              <input
                type="text"
                placeholder="Seu nome *"
                value={nome}
                onChange={(e) => { setNome(e.target.value); setError(""); }}
                onKeyDown={(e) => handleKeyDown(e, handleCadastrar)}
                maxLength={30}
                autoFocus
                className={inputClass}
              />
              <div className="relative w-full">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground select-none pointer-events-none">
                  @
                </span>
                <input
                  type="text"
                  placeholder="instagram (opcional)"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace(/^@+/, ""))}
                  onKeyDown={(e) => handleKeyDown(e, handleCadastrar)}
                  maxLength={30}
                  className="w-full pl-9 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground text-left text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {error && <p className="text-center text-xs text-destructive">{error}</p>}
              <button
                onClick={handleCadastrar}
                disabled={!nome.trim() || loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-lg transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                style={{ boxShadow: nome.trim() ? "0 0 20px hsl(199 78% 72% / 0.45)" : "none" }}
              >
                {loading ? "Criando conta…" : "ENTRAR E JOGAR"}
              </button>
              <button
                onClick={() => { setStep("whatsapp"); setNome(""); setInstagram(""); setError(""); }}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Voltar
              </button>
            </>
          )}

        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Espaço / Toque = Pular
        </div>

        {/* ── RANKING GLOBAL ───────────────────────────────────────── */}
        <div className="mt-8 w-full max-w-xs">
          <h3 className="text-accent font-bold text-sm mb-2 text-center flex items-center justify-center gap-1.5">
            <Trophy className="h-4 w-4" strokeWidth={1.75} />
            RANKING GLOBAL
          </h3>
          {loadingFans ? (
            <p className="text-center text-xs text-muted-foreground animate-pulse py-2">
              Carregando ranking…
            </p>
          ) : topFans.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-2">
              Nenhuma pontuação ainda. Seja o primeiro!
            </p>
          ) : (
            <div className="space-y-1">
              {topFans.map((f, i) => (
                <div key={f.whatsapp} className="flex justify-between rounded bg-muted px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground truncate max-w-[65%]">
                    {i + 1}. {f.nome}
                    {f.instagram ? (
                      <span className="ml-1 text-xs opacity-60">@{f.instagram}</span>
                    ) : null}
                  </span>
                  <span className="text-primary font-mono shrink-0">{f.maiorPontuacao}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StartScreen;
