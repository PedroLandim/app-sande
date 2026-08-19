CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE
);


CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,

    CONSTRAINT chk_task_type
        CHECK (type IN ('Atividade', 'Projeto'))
);


CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);


CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,

    team_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,

    role VARCHAR(100) NOT NULL,

    CONSTRAINT fk_team
        FOREIGN KEY (team_id)
        REFERENCES teams(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_team_student
        UNIQUE (team_id, student_id)
);


CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,

    task_id INTEGER NOT NULL,
    student_id INTEGER,
    team_id INTEGER,

    link TEXT NOT NULL,
    notes TEXT,

    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_submission_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_submission_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_submission_team
        FOREIGN KEY (team_id)
        REFERENCES teams(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_submission_author
        CHECK (
            (student_id IS NOT NULL AND team_id IS NULL)
            OR
            (student_id IS NULL AND team_id IS NOT NULL)
        )
);

