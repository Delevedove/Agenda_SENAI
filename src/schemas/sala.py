from pydantic import BaseModel, Field
from typing import List, Optional

class SalaCreateSchema(BaseModel):
    nome: str
    capacidade: int = Field(gt=0)
    recursos: Optional[List[str]] = []
    localizacao: Optional[str] = None
    tipo: Optional[str] = None
    status: Optional[str] = 'ativa'
    observacoes: Optional[str] = None

class SalaUpdateSchema(BaseModel):
    nome: Optional[str]
    capacidade: Optional[int] = Field(default=None, gt=0)
    recursos: Optional[List[str]]
    localizacao: Optional[str]
    tipo: Optional[str]
    status: Optional[str]
    observacoes: Optional[str]
