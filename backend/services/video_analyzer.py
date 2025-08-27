import os
import json
from typing import Dict, Any, List, Optional
from twelvelabs import TwelveLabs
from config.settings import settings


class VideoAnalyzer:
    def __init__(self):
        self.client = TwelveLabs(api_key=settings.twelvelabs_api_key)
        self.index_id = os.getenv("TWELVELABS_INDEX_ID", "default_index")
    
    async def analyze_video_marengo(self, video_path: str, original_prompt: str) -> Dict[str, Any]:
        """
        Analyze video using Marengo 2.7 for AI detection and consistency
        """
        try:
            # Upload video to TwelveLabs if not already indexed
            video_id = await self._ensure_video_indexed(video_path)
            
            # Analyze video for AI-generated content detection
            ai_analysis = await self._detect_ai_content(video_id, original_prompt)
            
            # Analyze video for consistency and hallucinations
            consistency_analysis = await self._analyze_consistency(video_id, original_prompt)
            
            # Calculate overall score
            marengo_score = self._calculate_marengo_score(ai_analysis, consistency_analysis)
            
            return {
                "success": True,
                "marengo_score": marengo_score,
                "ai_detection": ai_analysis,
                "consistency_analysis": consistency_analysis,
                "feedback": self._generate_marengo_feedback(marengo_score, ai_analysis, consistency_analysis)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "marengo_score": 0.0
            }
    
    async def analyze_video_pegasus(self, video_path: str, original_prompt: str, marengo_feedback: str) -> Dict[str, Any]:
        """
        Analyze video using Pegasus 1.2 for prompt improvement suggestions
        """
        try:
            video_id = await self._ensure_video_indexed(video_path)
            
            # Use Pegasus to analyze the video and suggest improvements
            analysis_prompt = f"""
            Analyze this video and provide feedback on how to improve the prompt for better results.
            
            Original Prompt: {original_prompt}
            Marengo Feedback: {marengo_feedback}
            
            Please provide:
            1. Specific improvements to the prompt
            2. Areas that need more detail
            3. Style and composition suggestions
            4. Technical improvements
            """
            
            result = self.client.analyze(
                video_id=video_id,
                prompt=analysis_prompt,
                temperature=0.3
            )
            
            # Extract analysis and suggestions
            pegasus_analysis = result.data if result.data else "No analysis available"
            suggestions = self._extract_suggestions(pegasus_analysis)
            
            return {
                "success": True,
                "pegasus_analysis": pegasus_analysis,
                "suggestions": suggestions,
                "confidence_score": self._calculate_confidence_score(pegasus_analysis, suggestions)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "pegasus_analysis": "Analysis failed"
            }
    
    async def _ensure_video_indexed(self, video_path: str) -> str:
        """
        Ensure video is indexed in TwelveLabs, return video_id
        """
        # This would typically involve checking if video exists in index
        # and uploading if necessary. For now, we'll assume it's already indexed
        # In production, implement proper video management
        return "sample_video_id"
    
    async def _detect_ai_content(self, video_id: str, original_prompt: str) -> Dict[str, Any]:
        """
        Detect AI-generated content using Marengo
        """
        # Search for AI-generated content patterns
        search_query = "AI generated video, computer graphics, synthetic content"
        
        response = self.client.search.query(
            index_id=self.index_id,
            search_options=["visual"],
            query_text=search_query,
            group_by="video",
            threshold="medium"
        )
        
        # Analyze search results for AI patterns
        ai_indicators = []
        for item in response:
            if item.score and item.score > 0.7:
                ai_indicators.append({
                    "timestamp": f"{item.start}-{item.end}",
                    "confidence": item.confidence,
                    "score": item.score
                })
        
        return {
            "ai_indicators": ai_indicators,
            "ai_probability": len(ai_indicators) / 10.0,  # Normalized score
            "total_indicators": len(ai_indicators)
        }
    
    async def _analyze_consistency(self, video_id: str, original_prompt: str) -> Dict[str, Any]:
        """
        Analyze video consistency with original prompt
        """
        # Use Pegasus to analyze consistency
        consistency_prompt = f"""
        Analyze this video for consistency with the original prompt.
        Check for:
        1. Objects and elements mentioned in the prompt
        2. Style consistency
        3. Temporal consistency
        4. Any hallucinations or inconsistencies
        
        Original Prompt: {original_prompt}
        """
        
        result = self.client.analyze(
            video_id=video_id,
            prompt=consistency_prompt,
            temperature=0.2
        )
        
        consistency_text = result.data if result.data else ""
        
        # Extract consistency score based on analysis
        consistency_score = self._extract_consistency_score(consistency_text)
        
        return {
            "consistency_score": consistency_score,
            "analysis": consistency_text,
            "issues": self._extract_consistency_issues(consistency_text)
        }
    
    def _calculate_marengo_score(self, ai_analysis: Dict, consistency_analysis: Dict) -> float:
        """
        Calculate overall Marengo score (0-100)
        """
        ai_score = (1 - ai_analysis.get("ai_probability", 0)) * 50  # Lower AI probability = higher score
        consistency_score = consistency_analysis.get("consistency_score", 0) * 50
        
        return min(100, max(0, ai_score + consistency_score))
    
    def _generate_marengo_feedback(self, score: float, ai_analysis: Dict, consistency_analysis: Dict) -> str:
        """
        Generate human-readable feedback based on Marengo analysis
        """
        if score >= 80:
            return "Excellent video quality with high consistency and natural appearance."
        elif score >= 60:
            return "Good video quality with minor inconsistencies that could be improved."
        elif score >= 40:
            return "Moderate quality with noticeable AI artifacts and inconsistencies."
        else:
            return "Low quality video with significant AI artifacts and poor consistency."
    
    def _extract_suggestions(self, analysis: str) -> List[str]:
        """
        Extract improvement suggestions from Pegasus analysis
        """
        # Simple extraction - in production, use more sophisticated NLP
        suggestions = []
        lines = analysis.split('\n')
        
        for line in lines:
            if any(keyword in line.lower() for keyword in ['improve', 'better', 'add', 'enhance', 'suggest']):
                suggestions.append(line.strip())
        
        return suggestions[:5]  # Limit to 5 suggestions
    
    def _extract_consistency_score(self, analysis: str) -> float:
        """
        Extract consistency score from analysis text
        """
        # Simple scoring based on positive/negative keywords
        positive_words = ['consistent', 'accurate', 'matches', 'good', 'excellent']
        negative_words = ['inconsistent', 'wrong', 'missing', 'bad', 'poor']
        
        positive_count = sum(1 for word in positive_words if word in analysis.lower())
        negative_count = sum(1 for word in negative_words if word in analysis.lower())
        
        total_words = positive_count + negative_count
        if total_words == 0:
            return 0.5
        
        return positive_count / total_words
    
    def _extract_consistency_issues(self, analysis: str) -> List[str]:
        """
        Extract specific consistency issues from analysis
        """
        issues = []
        lines = analysis.split('\n')
        
        for line in lines:
            if any(keyword in line.lower() for keyword in ['missing', 'wrong', 'inconsistent', 'hallucination']):
                issues.append(line.strip())
        
        return issues[:3]  # Limit to 3 issues
    
    def _calculate_confidence_score(self, analysis: str, suggestions: List[str]) -> float:
        """
        Calculate confidence score for the analysis
        """
        # Base score from analysis quality
        base_score = min(1.0, len(analysis) / 500.0)  # Normalize by expected length
        
        # Bonus for having suggestions
        suggestion_bonus = min(0.2, len(suggestions) * 0.04)
        
        return min(1.0, base_score + suggestion_bonus)
