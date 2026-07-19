import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../ui/components/cards/Card";
import { Botao } from "../../../ui/components/buttons/Botao";
import { Badge } from "../../../ui/components/cards/Badge";
import { Input } from "../../../ui/components/forms/Input";

const ANIMAIS = [
  { id:101, nome:"Pérola", especie:"Égua", raca:"Crioulo", idade:8, rga:"SC-001245", tutor:"João da Silva", status:"SAUDAVEL" },
  { id:102, nome:"Trovão", especie:"Cavalo", raca:"Mangalarga", idade:12, rga:"SC-001246", tutor:"João da Silva", status:"VACINA_VENCENDO" },
  { id:103, nome:"Luzia", especie:"Égua", raca:"Quarto de Milha", idade:5, rga:"SC-001247", tutor:"Maria Souza", status:"SAUDAVEL" },
  { id:104, nome:"Baiano", especie:"Cavalo", raca:"Crioulo", idade:15, rga:"SC-001248", tutor:"José Pereira", status:"EM_TRATAMENTO" },
];
const sCor = { SAUDAVEL:"sucesso", VACINA_VENCENDO:"alerta", EM_TRATAMENTO:"perigo" };
const sTxt = { SAUDAVEL:"Saudável", VACINA_VENCENDO:"Vacina vencendo", EM_TRATAMENTO:"Em tratamento" };

export default function ListaAnimaisPage() {
  const nav = useNavigate();
  const [f, setF] = useState("");
  const lista = ANIMAIS.filter(a => a.nome.toLowerCase().includes(f.toLowerCase()) || a.rga.includes(f));

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="titulo-pagina">🐎 Central Animal</h1>
          <p className="subtitulo-pagina !mb-0">Prontuário Veterinário — {lista.length} animais cadastrados</p>
        </div>
        <div className="flex gap-2 items-end">
          <div className="w-64"><Input placeholder="🔍 Nome ou RGA" value={f} onChange={e=>setF(e.target.value)} /></div>
          <Botao>+ Novo Animal</Botao>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {lista.map(a => (
          <Card key={a.id} className="cursor-pointer hover:!translate-y-[-2px]" onClick={()=>nav(`/animais/${a.id}`)}>
            <div className="h-32 rounded-md bg-gradient-to-br from-gov-100 to-gov-200 grid place-items-center text-5xl mb-3">🐴</div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gov-700">{a.nome}</h3>
              <Badge cor={sCor[a.status]}>{sTxt[a.status]}</Badge>
            </div>
            <p className="text-xs text-institucional-textoSecundario">{a.especie} · {a.raca} · {a.idade} anos</p>
            <p className="text-xs mt-1 text-institucional-textoSecundario">RGA: {a.rga}</p>
            <p className="text-xs mt-0.5 text-institucional-texto">👤 {a.tutor}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}