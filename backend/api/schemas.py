from pydantic import BaseModel, ConfigDict


class AsteroideBase(BaseModel):
    """
    Esquema base que define el contrato de datos estrictos para un asteroide.
    Las unidades están explicitas en los nombres de las variables
    """
    id: str
    name: str
    close_approach_date: str
    estimated_diameter_max_km: float
    is_potentially_hazardous: bool
    relative_velocity_km_h: float
    miss_distance_km: float

    # Configuración moderna de Pydantic V2 para leer objetos ORM de SQLalchemy
    model_config = ConfigDict(from_attributes=True)


class AsteroideResponse(AsteroideBase):
    """Esquema utilizado para responder a las peticiones del frontend.
    Hereda todos los atributos de AsteroideBase.
    """
    pass
