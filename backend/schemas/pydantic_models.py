from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    email: str
    username: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    confidence_threshold: float = Field(default=85.0, ge=0, le=100)
    max_attempts: int = Field(default=5, ge=1, le=10)


class ProjectCreate(ProjectBase):
    pass


class Project(ProjectBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class IterationBase(BaseModel):
    prompt: str
    iteration_number: int


class IterationCreate(IterationBase):
    project_id: int


class Iteration(IterationBase):
    id: int
    project_id: int
    generated_video_path: Optional[str] = None
    uploaded_video_path: Optional[str] = None
    marengo_score: Optional[float] = None
    pegasus_analysis: Optional[str] = None
    confidence_score: Optional[float] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class VideoGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=1000)
    project_id: int
    confidence_threshold: Optional[float] = Field(default=85.0, ge=0, le=100)
    max_attempts: Optional[int] = Field(default=5, ge=1, le=10)


class VideoUploadRequest(BaseModel):
    project_id: int
    original_prompt: str = Field(..., min_length=10, max_length=1000)
    confidence_threshold: Optional[float] = Field(default=85.0, ge=0, le=100)
    max_attempts: Optional[int] = Field(default=5, ge=1, le=10)


class VideoAnalysisResult(BaseModel):
    iteration_id: int
    marengo_score: float
    marengo_feedback: str
    pegasus_analysis: str
    confidence_score: float
    should_continue: bool
    suggested_improvements: List[str]


class ProjectStatus(BaseModel):
    project_id: int
    current_iteration: int
    total_iterations: int
    current_confidence: float
    target_confidence: float
    status: str
    estimated_completion: Optional[datetime] = None
