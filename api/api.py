from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db


app = FastAPI()


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://dashboard-sande.onrender.com"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# SCHEMAS
# =========================================================

class StudentCreate(BaseModel):
    matricula: str
    name: str
    email: str


class TaskCreate(BaseModel):
    title: str
    type: str
    desc: str


class TeamCreate(BaseModel):
    name: str
    student_email: str
    role: str


class TeamMemberCreate(BaseModel):
    email: str
    role: str


class SubmissionCreate(BaseModel):
    task_id: int
    student_email: str
    link: str
    notes: Optional[str] = ""


# =========================================================
# STUDENTS
# =========================================================

@app.get("/students")
def get_students(db: Session = Depends(get_db)):

    result = db.execute(
        text("""
            SELECT
                id,
                matricula,
                name,
                email
            FROM students
            ORDER BY name;
        """)
    )

    return [dict(row) for row in result.mappings().all()]


@app.post("/students")
def create_student(
    student: StudentCreate,
    db: Session = Depends(get_db)
):

    existing = db.execute(
        text("""
            SELECT id
            FROM students
            WHERE email = :email
               OR matricula = :matricula
            LIMIT 1;
        """),
        {
            "email": student.email,
            "matricula": student.matricula
        }
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="E-mail ou matrícula já cadastrados"
        )

    result = db.execute(
        text("""
            INSERT INTO students (
                matricula,
                name,
                email
            )
            VALUES (
                :matricula,
                :name,
                :email
            )
            RETURNING
                id,
                matricula,
                name,
                email;
        """),
        {
            "matricula": student.matricula,
            "name": student.name,
            "email": student.email
        }
    )

    new_student = result.mappings().one()

    db.commit()

    return dict(new_student)


@app.get("/students/{email}")
def get_student(
    email: str,
    db: Session = Depends(get_db)
):

    result = db.execute(
        text("""
            SELECT
                id,
                matricula,
                name,
                email
            FROM students
            WHERE email = :email;
        """),
        {
            "email": email
        }
    )

    student = result.mappings().first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

    return dict(student)


# =========================================================
# TASKS
# =========================================================

@app.get("/tasks")
def get_tasks(db: Session = Depends(get_db)):

    result = db.execute(
        text("""
            SELECT
                id,
                title,
                type,
                description AS "desc"
            FROM tasks
            ORDER BY id;
        """)
    )

    return [dict(row) for row in result.mappings().all()]


@app.post("/tasks")
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db)
):

    if task.type not in ["Atividade", "Projeto"]:
        raise HTTPException(
            status_code=400,
            detail="Tipo de atividade inválido"
        )

    result = db.execute(
        text("""
            INSERT INTO tasks (
                title,
                type,
                description
            )
            VALUES (
                :title,
                :type,
                :description
            )
            RETURNING
                id,
                title,
                type,
                description AS "desc";
        """),
        {
            "title": task.title,
            "type": task.type,
            "description": task.desc
        }
    )

    new_task = result.mappings().one()

    db.commit()

    return dict(new_task)


# =========================================================
# FUNÇÕES AUXILIARES DE GRUPO
# =========================================================

def get_team_with_members(
    db: Session,
    team_id: int
):

    result = db.execute(
        text("""
            SELECT
                t.id AS team_id,
                t.name AS team_name,

                s.id AS student_id,
                s.name AS student_name,
                s.email AS student_email,

                tm.role

            FROM teams t

            LEFT JOIN team_members tm
                ON tm.team_id = t.id

            LEFT JOIN students s
                ON s.id = tm.student_id

            WHERE t.id = :team_id

            ORDER BY tm.id;
        """),
        {
            "team_id": team_id
        }
    )

    rows = result.mappings().all()

    if not rows:
        return None

    team = {
        "id": rows[0]["team_id"],
        "name": rows[0]["team_name"],
        "members": []
    }

    for row in rows:

        if row["student_id"] is not None:

            team["members"].append({
                "id": row["student_id"],
                "name": row["student_name"],
                "email": row["student_email"],
                "role": row["role"]
            })

    return team


# =========================================================
# TEAMS
# =========================================================

@app.get("/teams")
def get_teams(db: Session = Depends(get_db)):

    result = db.execute(
        text("""
            SELECT
                t.id AS team_id,
                t.name AS team_name,

                s.id AS student_id,
                s.name AS student_name,
                s.email AS student_email,

                tm.role

            FROM teams t

            LEFT JOIN team_members tm
                ON tm.team_id = t.id

            LEFT JOIN students s
                ON s.id = tm.student_id

            ORDER BY t.id, tm.id;
        """)
    )

    rows = result.mappings().all()

    teams = {}

    for row in rows:

        team_id = row["team_id"]

        if team_id not in teams:

            teams[team_id] = {
                "id": team_id,
                "name": row["team_name"],
                "members": []
            }

        if row["student_id"] is not None:

            teams[team_id]["members"].append({
                "id": row["student_id"],
                "name": row["student_name"],
                "email": row["student_email"],
                "role": row["role"]
            })

    return list(teams.values())


@app.post("/teams")
def create_team(
    team: TeamCreate,
    db: Session = Depends(get_db)
):

    student = db.execute(
        text("""
            SELECT
                id,
                name,
                email
            FROM students
            WHERE email = :email;
        """),
        {
            "email": team.student_email
        }
    ).mappings().first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

    already_in_team = db.execute(
        text("""
            SELECT 1
            FROM team_members
            WHERE student_id = :student_id
            LIMIT 1;
        """),
        {
            "student_id": student["id"]
        }
    ).first()

    if already_in_team:
        raise HTTPException(
            status_code=400,
            detail="Aluno já pertence a um grupo"
        )

    result = db.execute(
        text("""
            INSERT INTO teams (name)
            VALUES (:name)
            RETURNING id;
        """),
        {
            "name": team.name
        }
    )

    team_id = result.scalar_one()

    db.execute(
        text("""
            INSERT INTO team_members (
                team_id,
                student_id,
                role
            )
            VALUES (
                :team_id,
                :student_id,
                :role
            );
        """),
        {
            "team_id": team_id,
            "student_id": student["id"],
            "role": team.role
        }
    )

    db.commit()

    return get_team_with_members(
        db,
        team_id
    )


@app.post("/teams/{team_id}/members")
def add_team_member(
    team_id: int,
    member: TeamMemberCreate,
    db: Session = Depends(get_db)
):

    team = db.execute(
        text("""
            SELECT id
            FROM teams
            WHERE id = :team_id;
        """),
        {
            "team_id": team_id
        }
    ).first()

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Grupo não encontrado"
        )

    member_count = db.execute(
        text("""
            SELECT COUNT(*)
            FROM team_members
            WHERE team_id = :team_id;
        """),
        {
            "team_id": team_id
        }
    ).scalar_one()

    if member_count >= 3:
        raise HTTPException(
            status_code=400,
            detail="Grupo já possui 3 membros"
        )

    student = db.execute(
        text("""
            SELECT
                id,
                name,
                email
            FROM students
            WHERE email = :email;
        """),
        {
            "email": member.email
        }
    ).mappings().first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

    already_in_team = db.execute(
        text("""
            SELECT 1
            FROM team_members
            WHERE student_id = :student_id
            LIMIT 1;
        """),
        {
            "student_id": student["id"]
        }
    ).first()

    if already_in_team:
        raise HTTPException(
            status_code=400,
            detail="Aluno já pertence a um grupo"
        )

    db.execute(
        text("""
            INSERT INTO team_members (
                team_id,
                student_id,
                role
            )
            VALUES (
                :team_id,
                :student_id,
                :role
            );
        """),
        {
            "team_id": team_id,
            "student_id": student["id"],
            "role": member.role
        }
    )

    db.commit()

    return get_team_with_members(
        db,
        team_id
    )


# =========================================================
# SUBMISSIONS
# =========================================================

@app.get("/submissions")
def get_submissions(
    db: Session = Depends(get_db)
):

    result = db.execute(
        text("""
            SELECT
                sub.id,

                sub.task_id,
                t.title AS task_title,

                sub.student_id,
                s.name AS student_name,

                sub.team_id,
                te.name AS team_name,

                sub.link,
                sub.notes,
                sub.submitted_at

            FROM submissions sub

            JOIN tasks t
                ON t.id = sub.task_id

            LEFT JOIN students s
                ON s.id = sub.student_id

            LEFT JOIN teams te
                ON te.id = sub.team_id

            ORDER BY sub.submitted_at DESC;
        """)
    )

    rows = result.mappings().all()

    submissions = []

    for row in rows:

        is_team = row["team_id"] is not None

        submissions.append({
            "id": row["id"],
            "taskId": row["task_id"],
            "taskTitle": row["task_title"],

            "authorName": (
                f"Grupo: {row['team_name']}"
                if is_team
                else row["student_name"]
            ),

            "authorType": (
                "Grupo"
                if is_team
                else "Individual"
            ),

            "link": row["link"],
            "notes": row["notes"],
            "submittedAt": row["submitted_at"]
        })

    return submissions


@app.post("/submissions")
def create_submission(
    data: SubmissionCreate,
    db: Session = Depends(get_db)
):

    task = db.execute(
        text("""
            SELECT
                id,
                title,
                type
            FROM tasks
            WHERE id = :task_id;
        """),
        {
            "task_id": data.task_id
        }
    ).mappings().first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Atividade não encontrada"
        )

    student = db.execute(
        text("""
            SELECT
                id,
                name,
                email
            FROM students
            WHERE email = :email;
        """),
        {
            "email": data.student_email
        }
    ).mappings().first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

    team = db.execute(
        text("""
            SELECT
                t.id,
                t.name
            FROM teams t

            JOIN team_members tm
                ON tm.team_id = t.id

            WHERE tm.student_id = :student_id

            LIMIT 1;
        """),
        {
            "student_id": student["id"]
        }
    ).mappings().first()

    if task["type"] == "Projeto" and not team:
        raise HTTPException(
            status_code=400,
            detail="Para enviar um projeto é necessário participar de um grupo"
        )

    if task["type"] == "Projeto":

        student_id = None
        team_id = team["id"]

    else:

        student_id = student["id"]
        team_id = None

    result = db.execute(
        text("""
            INSERT INTO submissions (
                task_id,
                student_id,
                team_id,
                link,
                notes
            )
            VALUES (
                :task_id,
                :student_id,
                :team_id,
                :link,
                :notes
            )
            RETURNING id, submitted_at;
        """),
        {
            "task_id": task["id"],
            "student_id": student_id,
            "team_id": team_id,
            "link": data.link,
            "notes": data.notes
        }
    ).mappings().one()

    db.commit()

    return {
        "id": result["id"],
        "taskId": task["id"],
        "taskTitle": task["title"],

        "authorName": (
            f"Grupo: {team['name']}"
            if task["type"] == "Projeto"
            else student["name"]
        ),

        "authorType": (
            "Grupo"
            if task["type"] == "Projeto"
            else "Individual"
        ),

        "link": data.link,
        "notes": data.notes,
        "submittedAt": result["submitted_at"]
    }