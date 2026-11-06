"""
Gera o dataset de operacao de armazem usado no projeto de Power BI.
Parametros calibrados a partir de uma operacao real de expedicao
(~2.500 volumes e ~300 paletes por turno, equipa de 4 no turno principal).
Dados SIMULADOS - o modelo generativo esta todo neste ficheiro.
"""
import numpy as np, pandas as pd

rng = np.random.default_rng(20260818)

INICIO, FIM = "2025-09-01", "2026-08-31"
dias = pd.date_range(INICIO, FIM, freq="D")
dias = dias[dias.dayofweek != 6]                     # domingo fechado

TURNOS = {
    # nome                 vol_base pal_base equipa  horas
    "Manhã (06–14)":      (2100,    250,     5,      8),
    "Tarde (14–22)":      (2680,    300,     4,      8),
    "Noite (22–06)":      (1150,    140,     3,      8),
}
TURNO_PRINCIPAL = "Tarde (14–22)"

# --- rotatividade real do turno principal: 6 substituicoes em 12 meses -------
SUBSTITUICOES = ["2025-10-13", "2025-12-01", "2026-01-19",
                 "2026-03-16", "2026-05-11", "2026-07-06"]
SUBSTITUICOES = [pd.Timestamp(d) for d in SUBSTITUICOES]

# antiguidade de cada um dos 4 postos do turno principal.
# cada substituicao entra num posto diferente, em rotacao.
INICIOS_BASE = [pd.Timestamp("2024-11-04"), pd.Timestamp("2025-02-17"),
                pd.Timestamp("2025-05-05"), pd.Timestamp("2025-07-14")]

def antiguidade_media(dia):
    """Antiguidade media (dias) dos 4 elementos do turno principal."""
    inicios = list(INICIOS_BASE)
    for k, s in enumerate(SUBSTITUICOES):
        if s <= dia:
            inicios[k % 4] = s
    return float(np.mean([(dia - i).days for i in inicios]))

# sazonalidade mensal (indice 1.0 = normal)
SAZON = {1:0.92, 2:0.94, 3:1.00, 4:1.02, 5:1.03, 6:1.05,
         7:1.08, 8:0.83, 9:1.00, 10:1.06, 11:1.24, 12:1.18}
# efeito dia da semana
DIA_SEM = {0:1.08, 1:1.03, 2:1.00, 3:1.02, 4:1.10, 5:0.72}

linhas = []
for dia in dias:
    saz = SAZON[dia.month]
    dsem = DIA_SEM[dia.dayofweek]
    ant = antiguidade_media(dia)
    # curva de maturidade da equipa: satura aos ~75 dias de antiguidade media
    maturidade = 0.78 + 0.22 * min(1.0, ant / 200.0)

    for turno, (vol_b, pal_b, equipa, horas) in TURNOS.items():
        principal = turno == TURNO_PRINCIPAL
        mat = maturidade if principal else 0.97 + rng.normal(0, 0.01)
        ruido = rng.normal(1.0, 0.055)

        volumes = int(max(200, vol_b * saz * dsem * mat * ruido))
        paletes = int(max(20, pal_b * saz * dsem * rng.normal(1.0, 0.06)))
        linhas_pick = int(volumes * rng.normal(1.32, 0.04))
        colaboradores = equipa if not principal else equipa
        horas_homem = colaboradores * horas

        # erros: sobem quando a equipa e' recente
        taxa_erro_base = 2.1 if principal else 2.4
        fator_erro = (1.0 / mat) ** 3.4
        erros = rng.poisson(max(0.2, taxa_erro_base * fator_erro * linhas_pick / 1000))

        encomendas = int(max(10, volumes / rng.normal(18, 1.2)))
        # taxa de servico: base 95,2% + ate 3,8 p.p. consoante a maturidade da equipa
        taxa_prazo = 0.948 + 0.045 * ((mat - 0.78) / 0.22) + rng.normal(0, 0.015)
        taxa_prazo = float(np.clip(taxa_prazo, 0.86, 0.995))
        no_prazo = int(round(encomendas * taxa_prazo))

        linhas.append({
            "Data": dia.date(),
            "Turno": turno,
            "Turno_Principal": "Sim" if principal else "Nao",
            "Colaboradores": colaboradores,
            "Horas_Homem": horas_homem,
            "Volumes_Expedidos": volumes,
            "Paletes_Expedidas": paletes,
            "Linhas_Picking": linhas_pick,
            "Erros_Separacao": int(erros),
            "Encomendas": encomendas,
            "Encomendas_No_Prazo": no_prazo,
            "Antiguidade_Media_Equipa_Dias": round(ant, 1) if principal else None,
        })

df = pd.DataFrame(linhas)
df.to_csv("/tmp/lk/projeto/fact_operacao.csv", index=False, encoding="utf-8-sig")

# --- dim calendario ---------------------------------------------------------
cal = pd.DataFrame({"Data": dias.date})
cal["Ano"] = [d.year for d in dias]
cal["Mes"] = [d.month for d in dias]
cal["Nome_Mes"] = [["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][d.month-1] for d in dias]
cal["Ano_Mes"] = [f"{d.year}-{d.month:02d}" for d in dias]
cal["Trimestre"] = [f"T{((d.month-1)//3)+1}" for d in dias]
cal["Dia_Semana"] = [["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"][d.dayofweek] for d in dias]
cal["Num_Dia_Semana"] = [d.dayofweek+1 for d in dias]
cal["Semana_Ano"] = [d.isocalendar()[1] for d in dias]
cal.to_csv("/tmp/lk/projeto/dim_calendario.csv", index=False, encoding="utf-8-sig")

# --- eventos de onboarding --------------------------------------------------
ev = pd.DataFrame({
    "Data": [s.date() for s in SUBSTITUICOES],
    "Evento": [f"Entrada de novo colaborador #{i+1}" for i in range(len(SUBSTITUICOES))],
    "Tipo": ["Onboarding"]*len(SUBSTITUICOES),
    "Turno": [TURNO_PRINCIPAL]*len(SUBSTITUICOES),
})
ev.to_csv("/tmp/lk/projeto/dim_eventos.csv", index=False, encoding="utf-8-sig")

with pd.ExcelWriter("/tmp/lk/projeto/dados_operacao_armazem.xlsx", engine="openpyxl") as w:
    df.to_excel(w, sheet_name="fact_operacao", index=False)
    cal.to_excel(w, sheet_name="dim_calendario", index=False)
    ev.to_excel(w, sheet_name="dim_eventos", index=False)

print("linhas:", len(df), "| dias:", len(dias))
print(df.groupby("Turno")[["Volumes_Expedidos","Paletes_Expedidas"]].mean().round(0))
p = df[df.Turno_Principal=="Sim"]
print("\nTurno principal:")
print(" volumes/turno medio:", round(p.Volumes_Expedidos.mean()))
print(" paletes/turno medio:", round(p.Paletes_Expedidas.mean()))
print(" produtividade vol/h-h:", round(p.Volumes_Expedidos.sum()/p.Horas_Homem.sum(),1))
print(" taxa servico:", round(100*p.Encomendas_No_Prazo.sum()/p.Encomendas.sum(),2),"%")
print(" erros/1000 linhas:", round(1000*p.Erros_Separacao.sum()/p.Linhas_Picking.sum(),2))
print(" antiguidade media:", round(p.Antiguidade_Media_Equipa_Dias.mean()))
