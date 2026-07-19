import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardCabecalho } from "../../../../ui/components/cards/Card";
import { Botao } from "../../../../ui/components/buttons/Botao";
import { Badge } from "../../../../ui/components/cards/Badge";

const ABAS = ["Resumo","Dados","Vacinas","Exames","Ocorrências","Medicamentos","Procedimentos","Documentos","Linha do Tempo"];

export default function ProntuarioAnimalPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [aba, setAba] = useState("Resumo");

  return (
    <div>
      <button onClick={()=>nav("/animais")} className="text-sm text-gov-600 hover:underline mb-2">← Voltar para lista</button>
      <div className="flex items-center gap-4 flex-wrap mb-4">
        <div className="w-20 h-20 rounded-full bg-gov-100 grid place-items-center text-4xl">🐴</div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gov-700">Pérola <span className="text-sm font-normal text-institucional-textoSecundario">#{id}</span></h1>
          <div className="flex gap-2 mt-1 text-sm flex-wrap">
            <span>Égua · Crioula · 8 anos</span>·<span>RGA: SC-001245</span>·<span>Tutor: João da Silva</span>
            <Badge cor="sucesso">● Saudável</Badge>
          </div>
        </div>
        <div className="flex gap-2"><Botao>✚ Vacina</Botao><Botao variante="secundario">Editar</Botao></div>
      </div>

      <div className="card-oficial !p-0 mb-4 overflow-x-auto">
        <div className="flex gap-1 px-2 border-b border-institucional-borda">
          {ABAS.map(a => (
            <button key={a} onClick={()=>setAba(a)}
              className={`px-3 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition ${aba===a?"border-gov-500 text-gov-700":"border-transparent text-institucional-textoSecundario hover:text-institucional-texto"}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {aba === "Resumo" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Card><CardCabecalho titulo="Peso" /><p className="text-2xl font-bold">420 kg</p><p className="text-xs text-institucional-textoSecundario">Última pesagem: 10/07</p></Card>
          <Card><CardCabecalho titulo="Próxima Vacina" /><p className="text-2xl font-bold text-orange-600">15/08</p><p className="text-xs text-institucional-textoSecundario">Antirrábica</p></Card>
          <Card><CardCabecalho titulo="Vermifugação" /><p className="text-2xl font-bold">OK</p><p className="text-xs text-institucional-textoSecundario">Aplicada: 02/05</p></Card>
          <Card><CardCabecalho titulo="Ocorrências" /><p className="text-2xl font-bold">2</p><p className="text-xs text-institucional-textoSecundario">Este ano</p></Card>
        </div>
      )}

      {aba === "Vacinas" && (
        <Card>
          <CardCabecalho titulo="Carteira de Vacinação" acao={<Botao tamanho="sm">+ Nova Vacina</Botao>} />
          <table className="tabela-oficial">
            <thead><tr><th>Vacina</th><th>Aplicação</th><th>Validade</th><th>Veterinário</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Antirrábica</td><td>15/08/2025</td><td>15/08/2026</td><td>Dr. Marcos</td><td><Badge cor="alerta">Vence em 27 dias</Badge></td></tr>
              <tr><td>Influenza Equina</td><td>10/03/2026</td><td>10/03/2027</td><td>Dr. Marcos</td><td><Badge cor="sucesso">Válida</Badge></td></tr>
              <tr><td>Tétano</td><td>20/01/2026</td><td>20/01/2027</td><td>Dra. Fernanda</td><td><Badge cor="sucesso">Válida</Badge></td></tr>
            </tbody>
          </table>
        </Card>
      )}

      {aba === "Linha do Tempo" && (
        <Card>
          <CardCabecalho titulo="Histórico Clínico Completo" />
          <div className="space-y-4">
            {[
              {d:"02/07/2026", t:"Antirrábica aplicada", m:"Vacina", c:"sucesso"},
              {d:"18/06/2026", t:"Consulta de rotina — peso 420kg", m:"Atendimento", c:"info"},
              {d:"22/04/2026", t:"Vermifugação oral", m:"Medicação", c:"info"},
              {d:"10/03/2026", t:"Influenza + Tétano aplicados", m:"Vacina", c:"sucesso"},
            ].map((x,i)=>(
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center"><div className="w-2.5 h-2.5 rounded-full bg-gov-500 mt-1.5"></div><div className="w-px flex-1 bg-institucional-borda"></div></div>
                <div className="flex-1 pb-3"><div className="flex gap-2 text-xs"><Badge cor={x.c}>{x.m}</Badge><span className="text-institucional-textoSecundario">{x.d}</span></div><p className="text-sm mt-0.5">{x.t}</p></div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!["Resumo","Vacinas","Linha do Tempo"].includes(aba) && (
        <Card className="p-16 text-center text-institucional-textoSecundario">
          <p className="text-5xl mb-3">🩺</p>
          <p className="font-semibold text-institucional-texto">Aba: {aba}</p>
          <p className="text-sm mt-1">Prontuário veterinário estruturado — conteúdo desta aba em desenvolvimento</p>
        </Card>
      )}
    </div>
  );
}