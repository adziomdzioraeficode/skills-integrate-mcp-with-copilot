"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
import json
from pathlib import Path
from typing import Optional
from pydantic import BaseModel

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Default activity data
default_activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


class MemberCreate(BaseModel):
    email: str
    name: str
    grade_level: str


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    grade_level: Optional[str] = None


db_file = current_dir / "db.json"


def _is_valid_email(email: str) -> bool:
    return isinstance(email, str) and "@" in email and "." in email.split("@")[-1]


def _build_default_members(activity_data: dict) -> dict:
    members = {}
    for activity in activity_data.values():
        for email in activity["participants"]:
            local_name = email.split("@")[0].replace(".", " ").title()
            members[email] = {
                "name": local_name,
                "grade_level": "Unknown"
            }
    return members


def _load_db() -> dict:
    if not db_file.exists():
        data = {
            "activities": default_activities,
            "members": _build_default_members(default_activities)
        }
        _save_db(data)
        return data

    with open(db_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Ensure expected keys exist even if file is manually edited.
    data.setdefault("activities", default_activities)
    data.setdefault("members", _build_default_members(data["activities"]))
    return data


def _save_db(data: dict) -> None:
    with open(db_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


db = _load_db()
activities = db["activities"]
members = db["members"]


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.get("/members")
def get_members():
    return members


@app.get("/members/{email}")
def get_member(email: str):
    if email not in members:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"email": email, **members[email]}


@app.post("/members")
def create_member(member: MemberCreate):
    email = member.email.strip().lower()

    if not _is_valid_email(email):
        raise HTTPException(status_code=400, detail="Invalid email")

    if email in members:
        raise HTTPException(status_code=400, detail="Member already exists")

    members[email] = {
        "name": member.name.strip(),
        "grade_level": member.grade_level.strip()
    }
    _save_db(db)
    return {"message": "Member created", "member": {"email": email, **members[email]}}


@app.put("/members/{email}")
def update_member(email: str, member_update: MemberUpdate):
    if email not in members:
        raise HTTPException(status_code=404, detail="Member not found")

    if member_update.name is not None:
        members[email]["name"] = member_update.name.strip()

    if member_update.grade_level is not None:
        members[email]["grade_level"] = member_update.grade_level.strip()

    _save_db(db)
    return {"message": "Member updated", "member": {"email": email, **members[email]}}


@app.delete("/members/{email}")
def delete_member(email: str):
    if email not in members:
        raise HTTPException(status_code=404, detail="Member not found")

    # Keep activity participant lists consistent with member records.
    for activity in activities.values():
        if email in activity["participants"]:
            activity["participants"].remove(email)

    deleted_member = members.pop(email)
    _save_db(db)
    return {"message": "Member deleted", "member": {"email": email, **deleted_member}}


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str):
    """Sign up a student for an activity"""
    email = email.strip().lower()

    if email not in members:
        raise HTTPException(
            status_code=400,
            detail="Member not found. Create the member first using /members"
        )

    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    _save_db(db)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str):
    """Unregister a student from an activity"""
    email = email.strip().lower()

    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    _save_db(db)
    return {"message": f"Unregistered {email} from {activity_name}"}
