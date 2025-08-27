import asyncio
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from services.video_generator import VideoGenerator
from services.video_analyzer import VideoAnalyzer
from schemas.pydantic_models import VideoGenerationRequest, VideoAnalysisResult
from config.settings import settings
from sqlalchemy.orm import Session


class RecursionEngine:
    def __init__(self):
        self.video_generator = VideoGenerator()
        self.video_analyzer = VideoAnalyzer()
    
    async def process_video_generation(self, request: VideoGenerationRequest, db: Session = None) -> Dict[str, Any]:
        """
        Main entry point for video generation with recursive improvement
        """
        try:
            project_id = request.project_id
            original_prompt = request.prompt
            confidence_threshold = request.confidence_threshold
            max_attempts = request.max_attempts
            
            iterations = []
            current_prompt = original_prompt
            current_confidence = 0.0
            attempt_count = 0
            
            while attempt_count < max_attempts and current_confidence < confidence_threshold:
                attempt_count += 1
                
                # Generate video
                generation_result = await self._generate_video_iteration(current_prompt, attempt_count)
                
                if not generation_result["success"]:
                    return {
                        "success": False,
                        "error": f"Video generation failed on attempt {attempt_count}: {generation_result['error']}",
                        "iterations": iterations
                    }
                
                video_path = generation_result["video_path"]
                
                # Analyze with Marengo
                marengo_result = await self.video_analyzer.analyze_video_marengo(
                    video_path, current_prompt
                )
                
                if not marengo_result["success"]:
                    return {
                        "success": False,
                        "error": f"Marengo analysis failed on attempt {attempt_count}",
                        "iterations": iterations
                    }
                
                marengo_score = marengo_result["marengo_score"]
                
                # Analyze with Pegasus for improvements
                pegasus_result = await self.video_analyzer.analyze_video_pegasus(
                    video_path, current_prompt, marengo_result["feedback"]
                )
                
                if not pegasus_result["success"]:
                    return {
                        "success": False,
                        "error": f"Pegasus analysis failed on attempt {attempt_count}",
                        "iterations": iterations
                    }
                
                # Calculate overall confidence
                current_confidence = self._calculate_overall_confidence(
                    marengo_score, pegasus_result["confidence_score"]
                )
                
                # Store iteration data
                iteration_data = {
                    "iteration_number": attempt_count,
                    "prompt": current_prompt,
                    "video_path": video_path,
                    "marengo_score": marengo_score,
                    "pegasus_analysis": pegasus_result["pegasus_analysis"],
                    "confidence_score": current_confidence,
                    "suggestions": pegasus_result["suggestions"],
                    "status": "completed"
                }
                
                iterations.append(iteration_data)
                
                # Check if we've reached the confidence threshold
                if current_confidence >= confidence_threshold:
                    break
                
                # Generate improved prompt for next iteration
                current_prompt = await self._generate_improved_prompt(
                    original_prompt, 
                    pegasus_result["suggestions"],
                    marengo_result["feedback"]
                )
            
            # Determine final status
            final_status = "completed" if current_confidence >= confidence_threshold else "max_attempts_reached"
            
            return {
                "success": True,
                "project_id": project_id,
                "final_confidence": current_confidence,
                "target_confidence": confidence_threshold,
                "total_iterations": attempt_count,
                "status": final_status,
                "iterations": iterations,
                "final_video_path": iterations[-1]["video_path"] if iterations else None,
                "best_prompt": iterations[-1]["prompt"] if iterations else original_prompt
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Recursion engine error: {str(e)}",
                "iterations": iterations if 'iterations' in locals() else []
            }
    
    async def process_video_upload(self, video_path: str, original_prompt: str, 
                                 confidence_threshold: float, max_attempts: int, db: Session = None) -> Dict[str, Any]:
        """
        Process uploaded video through the improvement pipeline
        """
        try:
            iterations = []
            current_prompt = original_prompt
            current_confidence = 0.0
            attempt_count = 0
            
            # Start with uploaded video analysis
            marengo_result = await self.video_analyzer.analyze_video_marengo(
                video_path, original_prompt
            )
            
            if not marengo_result["success"]:
                return {
                    "success": False,
                    "error": f"Initial Marengo analysis failed: {marengo_result['error']}"
                }
            
            marengo_score = marengo_result["marengo_score"]
            
            # Analyze with Pegasus
            pegasus_result = await self.video_analyzer.analyze_video_pegasus(
                video_path, original_prompt, marengo_result["feedback"]
            )
            
            if not pegasus_result["success"]:
                return {
                    "success": False,
                    "error": f"Initial Pegasus analysis failed: {pegasus_result['error']}"
                }
            
            current_confidence = self._calculate_overall_confidence(
                marengo_score, pegasus_result["confidence_score"]
            )
            
            # Store initial analysis
            iterations.append({
                "iteration_number": 0,
                "prompt": original_prompt,
                "video_path": video_path,
                "marengo_score": marengo_score,
                "pegasus_analysis": pegasus_result["pegasus_analysis"],
                "confidence_score": current_confidence,
                "suggestions": pegasus_result["suggestions"],
                "status": "uploaded_video"
            })
            
            # If already meeting threshold, return early
            if current_confidence >= confidence_threshold:
                return {
                    "success": True,
                    "final_confidence": current_confidence,
                    "target_confidence": confidence_threshold,
                    "total_iterations": 1,
                    "status": "completed",
                    "iterations": iterations,
                    "final_video_path": video_path,
                    "best_prompt": original_prompt
                }
            
            # Continue with recursive improvement
            return await self.process_video_generation({
                "prompt": current_prompt,
                "project_id": 0,  # Placeholder
                "confidence_threshold": confidence_threshold,
                "max_attempts": max_attempts
            })
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Upload processing error: {str(e)}"
            }
    
    async def _generate_video_iteration(self, prompt: str, iteration_number: int) -> Dict[str, Any]:
        """
        Generate a single video iteration
        """
        # Validate prompt
        validation = self.video_generator.validate_prompt(prompt)
        if not validation["valid"]:
            return {
                "success": False,
                "error": validation["error"]
            }
        
        # Generate video
        return await self.video_generator.generate_video(prompt)
    
    async def _generate_improved_prompt(self, original_prompt: str, 
                                      suggestions: List[str], marengo_feedback: str) -> str:
        """
        Generate an improved prompt based on analysis feedback
        """
        if not suggestions:
            return original_prompt
        
        # Combine suggestions into improved prompt
        improvement_notes = "\n".join([f"- {suggestion}" for suggestion in suggestions[:3]])
        
        improved_prompt = f"""
        {original_prompt}
        
        Improvements based on analysis:
        {improvement_notes}
        
        Focus on: {marengo_feedback}
        """
        
        # Clean up and limit length
        improved_prompt = " ".join(improved_prompt.split())
        if len(improved_prompt) > 1000:
            improved_prompt = improved_prompt[:997] + "..."
        
        return improved_prompt
    
    def _calculate_overall_confidence(self, marengo_score: float, pegasus_confidence: float) -> float:
        """
        Calculate overall confidence score combining both analyses
        """
        # Weighted combination: Marengo (70%) + Pegasus (30%)
        weighted_score = (marengo_score * 0.7) + (pegasus_confidence * 100 * 0.3)
        
        return min(100, max(0, weighted_score))
    
    async def get_project_status(self, project_id: int, db: Session = None) -> Dict[str, Any]:
        """
        Get current status of a project
        """
        # This would typically query the database
        # For now, return a placeholder
        return {
            "project_id": project_id,
            "status": "processing",
            "current_iteration": 1,
            "estimated_completion": datetime.now().isoformat()
        }
