from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional

class InstrutorCreateSchema(BaseModel):
    nome: str
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    capacidades: Optional[List[str]] = []
    area_atuacao: Optional[str] = None
    disponibilidade: Optional[List[str]] = []
    status: Optional[str] = 'ativo'
    observacoes: Optional[str] = None

class InstrutorUpdateSchema(BaseModel):
    nome: Optional[str]
    email: Optional[EmailStr]
    telefone: Optional[str]
    capacidades: Optional[List[str]]
    area_atuacao: Optional[str]
    disponibilidade: Optional[List[str]]
    status: Optional[str]
    observacoes: Optional[str]
