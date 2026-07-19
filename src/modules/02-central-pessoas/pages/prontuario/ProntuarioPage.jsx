import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardCabecalho } from "../../../../ui/components/cards/Card";
import { Botao } from "../../../../ui/components/buttons/Botao";
import { Badge } from "../../../../ui/components/cards/Badge";
import { Input } from "../../../../ui/components/forms/Input";

const ABAS = ["Resumo","Dados Pessoais","Financeiro","Animais","Documentos","Carteirinhas","RGA","Processos","Histórico","Observações"];

export default function ProntuarioPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [aba, setAba] = useState("Resumo");

  return (
    <div>
      <div className="mb-4">
        <button onClick={()=>nav("/pessoas")} className="text-sm text-gov-600 hover:underline mb-2">← Voltar para lista</button>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-gov-100 text-gov-600 grid place-items-center text-2xl font-bold">JS</div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gov-700">João da Silva</h1>
            <div className="flex gap-2 mt-1 text-sm text-institucional-textoSecundario flex-wrap">
              <span>CPF: 123.456.789-00</span>·<span>Associado desde 2018</span>·<span>Matrícula #AAC-00{id}</span>
              <Badge cor="sucesso">● Em dia</Badge>
            </div>
          </div>
          <div className="flex gap-2"><Botao>Editar</Botao><Botao variante="secundario">Nova Carteirinha</Botao></div>
        </div>
      </div>

      {/* Abas */}
      <div className="card-oficial !p-0 mb-4 overflow-x-auto">
        <div className="flex gap-1 px-2 border-b border-institucional-borda">
          {ABAS.map(a => (
            <button key={a} onClick={()=>setAba(a)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition ${aba===a?"border-gov-500 text-gov-700":"border-transparent text-institucional-textoSecundario hover:text-institucional-texto"}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo por aba */}
      {aba === "Resumo" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card><CardCabecalho titulo="Situação Financeira" /><p className="text-3xl font-bold text-green-600">● Em dia</p><p className="text-sm mt-1 text-institucional-textoSecundario">Nenhuma mensalidade atrasada</p></Card>
          <Card><CardCabecalho titulo="Animais Vinculados" /><p className="text-3xl font-bold text-gov-700">3</p><p className="text-sm mt-1 text-institucional-textoSecundario">2 cavalos · 1 égua</p></Card>
          <Card><CardCabecalho titulo="Documentos" /><p className="text-3xl font-bold text-gov-700">8</p><p className="text-sm mt-1 text-institucional-textoSecundario">6 assinados · 2 pendentes</p></Card>
          <Card className="lg:col-span-3"><CardCabecalho titulo="Linha do tempo recente" />
            <div className="space-y-3 text-sm">
              {[
                {d:"15/07/2026", t:"Mensalidade Julho/2026 paga via Pix", c:"sucesso"},
                {d:"10/07/2026", t:"Carteirinha 2026 emitida", c:"info"},
                {d:"02/07/2026", t:"Vacina antirrábica aplicada em 'Pérola'", c:"sucesso"},
                {d:"20/06/2026", t:"Assinou Ata da Assembleia Geral", c:"info"},
              ].map((x,i)=>(
                <div key={i} className="flex gap-3"><Badge cor={x.c}>{x.d}</Badge><span>{x.t}</span></div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {aba === "Dados Pessoais" && (
        <Card>
          <CardCabecalho titulo="Dados Cadastrais" subtitulo="Formatação automática: CPF, Telefone, CEP" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Nome Completo" defaultValue="João da Silva" />
            <Input label="CPF" defaultValue="123.456.789-00" />
            <Input label="RG" defaultValue="12.345.678-9" />
            <Input label="Telefone" defaultValue="(47) 99999-1111" />
            <Input label="E-mail" defaultValue="joao@aac.org.br" />
            <Input label="CEP" defaultValue="89201-000" />
            <Input label="Endereço" className="md:col-span-2 lg:col-span-2" defaultValue="Rua das Flores, 123" />
            <Input label="Bairro" defaultValue="Centro" />
            <Input label="Cidade" defaultValue="Joinville" />
            <Input label="UF" defaultValue="SC" />
          </div>
          <div className="mt-6 flex justify-end"><Botao>💾 Salvar alterações</Botao></div>
        </Card>
      )}

      {!["Resumo","Dados Pessoais"].includes(aba) && (
        <Card className="p-16 text-center text-institucional-textoSecundario">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-semibold text-institucional-texto">Aba: {aba}</p>
          <p className="text-sm mt-1">Módulo completo sendo implementado — estrutura do prontuário 100% pronta</p>
        </Card>
      )}
    </div>
  );
}