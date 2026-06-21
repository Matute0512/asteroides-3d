from sqlalchemy import Column, String, Float, Boolean
from backend.db.database import Base


class Asteroide(Base):
    __tablename__ = "asteroides"
    __table_args__ = {"extend_existing": True}

    # Clave Primaria
    id = Column(String, primary_key=True, index=True)

    # Atributos Básicos id y fecha
    name = Column(String, nullable=False)
    close_approach_date = Column(String, nullable=False, index=True)

    # Dimensión y Seguridad
    estimated_diameter_max_km = Column(Float, nullable=False)
    is_potentially_hazardous = Column(Boolean, nullable=False)

    # Datos físicos para la simulación 3D (Convertidos a Float para cálculos)
    relative_velocity_km_h = Column(Float, nullable=False)
    miss_distance_km = Column(Float, nullable=False)
