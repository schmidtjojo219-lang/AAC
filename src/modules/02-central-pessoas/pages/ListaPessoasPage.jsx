import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardCabecalho } from "../../../ui/components/cards/Card";
import { Botao } from "../../../ui/components/buttons/Botao";
import { Badge } from "../../../ui/components/cards/Badge";
import { Input } from "../../../ui/components/forms/Input";

const ASSOCIADOS = [
  { id:1, nome:"João da Silva", cpf:"123.456.789-00", status:"EM_DIA", telefone:"(47) 99999-1111", desde:"2018", animais:3 },
  { id:2, nome:"Maria Aparecida Souza", cpf:"987.654.321-00", status:"EM_DIA", telefone:"(47) 99999-2222", desde:"2020", animais:2 },
  { id:3, nome:"José Carlos Pereira", cpf:"111.222.333-44", status:"ATRASADO", telefone:"(47) 99999-3333", desde:"2015", animais:4 },
  { id:4, nome:"Ana Paula Lima", cpf:"444.555.666-77", status:"EM_DIA", telefone:"(47) 99999-4444", desde:"2023", animais:1 },
  { id:5, nome:"Carlos Roberto Mendes", cpf:"777.888.999-00", status:"PENDENTE", telefone:"(47) 99999-5555", desde:"2024", animais:2 },
];

const statusCor = { EM_DIA:"sucesso", ATRASADO:"perigo", PENDENTE:"alerta" };
const statusTxt = { EM_DIA:"Em dia", ATRASADO:"Atrasado", PENDENTE:"Pendente" };

export default function ListaPessoasPage() {
  const nav = useNavigate();
  const [filtro, setFiltro] = useState("");
  const lista = ASSOCIADOS.filter(a => a.nome.toLowerCase().includes(filtro.toLowerCase()) || a.cpf.includes(filtro));

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="titulo-pagina">👥 Central de Pessoas</h1>
          <p className="subtitulo-pagina !mb-0">Prontuário Institucional — {lista.length} associados</p>
        </div>
        <div className="flex gap-2 items-end">
          <div className="w-64"><Input placeholder="🔍 Pesquisar nome ou CPF" value={filtro} onChange={e=>setFiltro(e.target.value)} /></div>
          <Botao variante="primario">+ Novo Associado</Botao>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <table className="tabela-oficial">
          <thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Desde</th><th>Animais</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {lista.map(a => (
              <tr key={a.id} className="cursor-pointer hover:!bg-gov-50" onClick={()=>nav(`/pessoas/${a.id}`)}>
                <td className="font-semibold">{a.nome}</td>
                <td>{a.cpf}</td>
                <td>{a.telefone}</td>
                <td>{a.desde}</td>
                <td>{a.animais}</td>
                <td><Badge cor={statusCor[a.status]}>{statusTxt[a.status]}</Badge></td>
                <td className="text-right"><Botao tamanho="sm" variante="secundario">Abrir →</Botao></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}