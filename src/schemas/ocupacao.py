from pydantic import BaseModel, Field
from typing import Optional

class OcupacaoCreateSchema(BaseModel):
    sala_id: int
    curso_evento: str
    data_inicio: str
    data_fim: str
    turno: str
    instrutor_id: Optional[int] = None
    tipo_ocupacao: Optional[str] = 'aula_regular'
    recorrencia: Optional[str] = 'unica'
    status: Optional[str] = 'confirmado'
    observacoes: Optional[str] = None

class OcupacaoUpdateSchema(BaseModel):
    sala_id: Optional[int]
    instrutor_id: Optional[int]
    curso_evento: Optional[str]
    data_inicio: Optional[str]
    data_fim: Optional[str]
    data: Optional[str]
    turno: Optional[str]
    horario_inicio: Optional[str]
    horario_fim: Optional[str]
    tipo_ocupacao: Optional[str]
    recorrencia: Optional[str]
    status: Optional[str]
    observacoes: Optional[str]
