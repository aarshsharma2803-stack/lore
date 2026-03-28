"""
MintTales Fetch.ai Story Recommendation Agent
Runs as an autonomous uAgent that analyzes stories in MongoDB
and provides personalized recommendations.

Requires: pip install uagents pymongo
"""

from uagents import Agent, Context, Model
from pymongo import MongoClient
import os
import json
from datetime import datetime

# Agent configuration
AGENT_NAME = "minttales-recommender"
AGENT_SEED = "minttales-story-agent-beachhacks-9"
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

# Create the agent
agent = Agent(
    name=AGENT_NAME,
    seed=AGENT_SEED,
    port=8001,
    endpoint=["http://localhost:8001/submit"],
)


class StoryAnalysis(Model):
    total_stories: int
    top_genres: dict
    recommendations: list
    timestamp: str


class RecommendationRequest(Model):
    user_preferences: list = []


# Store analysis results
latest_analysis = {
    "total_stories": 0,
    "top_genres": {},
    "recommendations": [],
    "timestamp": "",
}


def analyze_stories():
    """Analyze stories in MongoDB and generate recommendations."""
    global latest_analysis

    try:
        client = MongoClient(MONGODB_URI)
        db = client["minttales"]
        stories = list(db.stories.find().sort("createdAt", -1).limit(100))

        if not stories:
            latest_analysis = {
                "total_stories": 0,
                "top_genres": {},
                "recommendations": [],
                "timestamp": datetime.now().isoformat(),
            }
            return

        # Genre analysis
        genre_counts = {}
        for story in stories:
            genre = story.get("genre", "unknown")
            genre_counts[genre] = genre_counts.get(genre, 0) + 1

        # Top stories by votes
        top_stories = sorted(stories, key=lambda s: s.get("votes", 0), reverse=True)[:6]

        recommendations = []
        for story in top_stories:
            recommendations.append({
                "storyId": str(story["_id"]),
                "title": story.get("prompt", "Untitled"),
                "genre": story.get("genre", "unknown"),
                "votes": story.get("votes", 0),
                "score": story.get("votes", 0) * 10 + len(story.get("content", "")),
                "reason": f"Popular {story.get('genre', '')} story with {story.get('votes', 0)} votes",
            })

        latest_analysis = {
            "total_stories": len(stories),
            "top_genres": genre_counts,
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat(),
        }

        client.close()
        print(f"🤖 Agent: Analyzed {len(stories)} stories. Top genre: {max(genre_counts, key=genre_counts.get) if genre_counts else 'none'}")

    except Exception as e:
        print(f"🤖 Agent Error: {e}")


@agent.on_event("startup")
async def on_startup(ctx: Context):
    ctx.logger.info(f"MintTales Recommendation Agent started!")
    ctx.logger.info(f"Agent address: {agent.address}")
    analyze_stories()


@agent.on_interval(period=30.0)
async def periodic_analysis(ctx: Context):
    """Re-analyze stories every 30 seconds."""
    ctx.logger.info("Running periodic story analysis...")
    analyze_stories()


@agent.on_message(model=RecommendationRequest)
async def handle_recommendation(ctx: Context, sender: str, msg: RecommendationRequest):
    ctx.logger.info(f"Recommendation request from {sender}")
    analyze_stories()
    await ctx.send(
        sender,
        StoryAnalysis(
            total_stories=latest_analysis["total_stories"],
            top_genres=latest_analysis["top_genres"],
            recommendations=latest_analysis["recommendations"],
            timestamp=latest_analysis["timestamp"],
        ),
    )


if __name__ == "__main__":
    print(f"🤖 Starting MintTales Recommendation Agent...")
    print(f"📍 Agent Address: {agent.address}")
    print(f"🔗 Endpoint: http://localhost:8001")
    agent.run()
