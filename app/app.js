// =========================================================
// CONFIGURAÇÃO
// =========================================================

const API_URL = "http://localhost:8000";

let currentUser = null;


// =========================================================
// FUNÇÃO AUXILIAR PARA CHAMAR A API
// =========================================================

async function apiRequest(path, options = {}) {

    try {

        const response = await fetch(
            `${API_URL}${path}`,
            options
        );


        if (!response.ok) {

            let message =
                `Erro ${response.status}`;

            try {

                const error =
                    await response.json();

                if (error.detail) {

                    if (
                        typeof error.detail === "string"
                    ) {
                        message =
                            error.detail;
                    } else {
                        message =
                            JSON.stringify(
                                error.detail
                            );
                    }
                }

            } catch {
                // mantém mensagem padrão
            }


            throw new Error(message);
        }


        return await response.json();

    } catch (error) {

        console.error(
            "Erro ao acessar a API:",
            error
        );

        throw error;
    }
}


// =========================================================
// FUNÇÕES DE SEGURANÇA BÁSICAS PARA EXIBIÇÃO
// =========================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function safeUrl(value) {

    try {

        const url =
            new URL(value);

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            return "#";
        }

        return url.href;

    } catch {

        return "#";
    }
}


// =========================================================
// TABS
// =========================================================

function switchTab(tab) {

    const loginForm =
        document.getElementById(
            "login-form"
        );

    const registerForm =
        document.getElementById(
            "register-form"
        );

    const buttons =
        document.querySelectorAll(
            ".tabs .tab-btn"
        );


    if (tab === "login") {

        loginForm.classList.remove(
            "hidden"
        );

        registerForm.classList.add(
            "hidden"
        );

        buttons[0].classList.add(
            "active"
        );

        buttons[1].classList.remove(
            "active"
        );

    } else {

        loginForm.classList.add(
            "hidden"
        );

        registerForm.classList.remove(
            "hidden"
        );

        buttons[0].classList.remove(
            "active"
        );

        buttons[1].classList.add(
            "active"
        );
    }
}


// =========================================================
// LOGIN - TIPO DE USUÁRIO
// =========================================================

function toggleLoginInputs() {

    const role =
        document.getElementById(
            "login-role"
        ).value;


    const emailGroup =
        document.getElementById(
            "login-email-group"
        );


    const emailInput =
        document.getElementById(
            "login-email"
        );


    if (role === "professor") {

        emailGroup.classList.add(
            "hidden"
        );

        emailInput.required =
            false;

    } else {

        emailGroup.classList.remove(
            "hidden"
        );

        emailInput.required =
            true;
    }
}


// =========================================================
// CADASTRO
// =========================================================

async function handleRegister(e) {

    e.preventDefault();


    const newStudent = {

        matricula:
            document.getElementById(
                "reg-id"
            ).value.trim(),

        name:
            document.getElementById(
                "reg-name"
            ).value.trim(),

        email:
            document.getElementById(
                "reg-email"
            ).value.trim()
    };


    try {

        await apiRequest(
            "/students",
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        newStudent
                    )
            }
        );


        alert(
            "Aluno cadastrado com sucesso!"
        );


        e.target.reset();


        document.getElementById(
            "login-email"
        ).value =
            newStudent.email;


        switchTab(
            "login"
        );

    } catch (error) {

        alert(
            error.message
        );
    }
}


// =========================================================
// LOGIN
// =========================================================

async function handleLogin(e) {

    e.preventDefault();


    const role =
        document.getElementById(
            "login-role"
        ).value;


    try {

        if (
            role === "professor"
        ) {

            /*
             * TEMPORÁRIO:
             *
             * ainda não existe autenticação
             * real do professor.
             */

            currentUser = {
                name:
                    "Professor",

                role:
                    "professor"
            };

        } else {

            const email =
                document.getElementById(
                    "login-email"
                ).value.trim();


            const student =
                await apiRequest(
                    `/students/${encodeURIComponent(email)}`
                );


            currentUser = {
                ...student,
                role:
                    "student"
            };
        }


        await renderApp();

    } catch (error) {

        alert(
            error.message
        );
    }
}


// =========================================================
// LOGOUT
// =========================================================

function logout() {

    currentUser =
        null;


    document
        .getElementById(
            "auth-screen"
        )
        .classList
        .remove(
            "hidden"
        );


    document
        .getElementById(
            "professor-dashboard"
        )
        .classList
        .add(
            "hidden"
        );


    document
        .getElementById(
            "student-dashboard"
        )
        .classList
        .add(
            "hidden"
        );


    document
        .getElementById(
            "user-info"
        )
        .classList
        .add(
            "hidden"
        );
}


// =========================================================
// RENDERIZAÇÃO PRINCIPAL
// =========================================================

async function renderApp() {

    document
        .getElementById(
            "auth-screen"
        )
        .classList
        .add(
            "hidden"
        );


    document
        .getElementById(
            "user-info"
        )
        .classList
        .remove(
            "hidden"
        );


    document
        .getElementById(
            "professor-dashboard"
        )
        .classList
        .add(
            "hidden"
        );


    document
        .getElementById(
            "student-dashboard"
        )
        .classList
        .add(
            "hidden"
        );


    document.getElementById(
        "user-display"
    ).innerText =
        `${currentUser.name} (${currentUser.role.toUpperCase()})`;


    if (
        currentUser.role ===
        "professor"
    ) {

        document
            .getElementById(
                "professor-dashboard"
            )
            .classList
            .remove(
                "hidden"
            );


        await renderProfessorDashboard();

    } else {

        document
            .getElementById(
                "student-dashboard"
            )
            .classList
            .remove(
                "hidden"
            );


        await renderStudentDashboard();
    }
}


// =========================================================
// PROFESSOR - CRIAR ATIVIDADE
// =========================================================

async function handleCreateTask(e) {

    e.preventDefault();


    const newTask = {

        title:
            document.getElementById(
                "task-title"
            ).value.trim(),

        type:
            document.getElementById(
                "task-type"
            ).value,

        desc:
            document.getElementById(
                "task-desc"
            ).value.trim()
    };


    try {

        await apiRequest(
            "/tasks",
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        newTask
                    )
            }
        );


        alert(
            "Atividade/Projeto criado com sucesso!"
        );


        e.target.reset();


        await renderProfessorDashboard();

    } catch (error) {

        alert(
            error.message
        );
    }
}


// =========================================================
// PROFESSOR - DASHBOARD
// =========================================================

async function renderProfessorDashboard() {

    try {

        const [
            teams,
            submissions
        ] =
            await Promise.all([
                apiRequest(
                    "/teams"
                ),
                apiRequest(
                    "/submissions"
                )
            ]);


        renderProfessorTeams(
            teams
        );


        renderSubmissions(
            submissions
        );

    } catch (error) {

        alert(
            `Erro ao carregar dashboard: ${error.message}`
        );
    }
}


// =========================================================
// PROFESSOR - LISTA DE GRUPOS
// =========================================================

function renderProfessorTeams(
    teams
) {

    const teamsList =
        document.getElementById(
            "professor-teams-list"
        );


    if (
        teams.length === 0
    ) {

        teamsList.innerHTML =
            "<p>Nenhum grupo formado ainda.</p>";

        return;
    }


    teamsList.innerHTML =
        "";


    teams.forEach(
        team => {

            const members =
                team.members
                    .map(
                        member => `
                            <li>
                                ${escapeHtml(member.name)}
                                -
                                <i>
                                    Papel:
                                    ${escapeHtml(member.role)}
                                </i>
                            </li>
                        `
                    )
                    .join("");


            teamsList.innerHTML += `
                <div class="item-card">

                    <h4>
                        ${escapeHtml(team.name)}
                    </h4>

                    <p>
                        <strong>
                            Integrantes:
                        </strong>
                    </p>

                    <ul
                        style="
                            padding-left: 1rem;
                            font-size: 0.85rem;
                        "
                    >
                        ${members}
                    </ul>

                </div>
            `;
        }
    );
}


// =========================================================
// PROFESSOR - ENTREGAS
// =========================================================

function renderSubmissions(
    submissions
) {

    const subList =
        document.getElementById(
            "submissions-list"
        );


    if (
        submissions.length === 0
    ) {

        subList.innerHTML =
            "<p>Nenhuma entrega realizada até o momento.</p>";

        return;
    }


    subList.innerHTML =
        "";


    submissions.forEach(
        sub => {

            const url =
                safeUrl(
                    sub.link
                );


            subList.innerHTML += `
                <div class="item-card">

                    <h4>
                        ${escapeHtml(sub.taskTitle)}

                        <span class="badge">
                            ${escapeHtml(sub.authorType)}
                        </span>
                    </h4>

                    <p>
                        <strong>
                            Enviado por:
                        </strong>

                        ${escapeHtml(sub.authorName)}
                    </p>

                    <p>
                        <strong>
                            Link:
                        </strong>

                        <a
                            href="${url}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${escapeHtml(sub.link)}
                        </a>
                    </p>

                    ${
                        sub.notes
                            ? `
                                <p>
                                    <strong>
                                        Obs:
                                    </strong>

                                    ${escapeHtml(sub.notes)}
                                </p>
                            `
                            : ""
                    }

                </div>
            `;
        }
    );
}


// =========================================================
// ALUNO - DASHBOARD
// =========================================================

async function renderStudentDashboard() {

    await Promise.all([
        renderTeamSection(),
        renderStudentTasks()
    ]);
}


// =========================================================
// ALUNO - GRUPO
// =========================================================

async function renderTeamSection() {

    try {

        const teams =
            await apiRequest(
                "/teams"
            );


        const myTeam =
            teams.find(
                team =>
                    team.members.some(
                        member =>
                            member.email ===
                            currentUser.email
                    )
            );


        const teamContainer =
            document.getElementById(
                "team-section"
            );


        if (
            myTeam
        ) {

            const membersHtml =
                myTeam.members
                    .map(
                        member => `
                            <li class="item-card">

                                <strong>
                                    ${escapeHtml(member.name)}
                                </strong>

                                (${escapeHtml(member.email)})

                                <br>

                                <small>
                                    Papel:

                                    <b>
                                        ${escapeHtml(member.role)}
                                    </b>
                                </small>

                            </li>
                        `
                    )
                    .join("");


            teamContainer.innerHTML = `
                <h4>
                    Grupo:
                    ${escapeHtml(myTeam.name)}
                </h4>

                <br>

                <p>
                    <strong>
                        Membros atuais:
                    </strong>
                </p>

                <ul
                    class="item-list"
                    style="
                        margin-top: 0.5rem;
                    "
                >
                    ${membersHtml}
                </ul>
            `;


            if (
                myTeam.members.length < 3
            ) {

                const options =
                    await getAvailableStudentsOptions(
                        teams
                    );


                teamContainer.innerHTML += `
                    <hr
                        style="
                            margin: 1rem 0;
                        "
                    >

                    <form
                        onsubmit="
                            handleAddMember(
                                event,
                                '${myTeam.id}'
                            )
                        "
                    >

                        <div class="form-group">

                            <label for="add-member-email">
                                Adicionar Aluno ao Grupo
                            </label>

                            <select
                                id="add-member-email"
                                required
                            >
                                ${options}
                            </select>

                        </div>


                        <div class="form-group">

                            <label for="add-member-role">
                                Papel do integrante
                            </label>

                            <input
                                type="text"
                                id="add-member-role"
                                required
                                placeholder="Ex: Designer, Dev"
                            >

                        </div>


                        <button
                            type="submit"
                            class="btn-primary"
                        >
                            Adicionar ao Grupo
                        </button>

                    </form>
                `;
            }

        } else {

            teamContainer.innerHTML = `

                <p>
                    Você ainda não possui um grupo.
                </p>

                <br>


                <form
                    onsubmit="
                        handleCreateTeam(event)
                    "
                >

                    <div class="form-group">

                        <label for="new-team-name">
                            Nome do Grupo
                        </label>

                        <input
                            type="text"
                            id="new-team-name"
                            required
                            placeholder="Ex: Time Alpha"
                        >

                    </div>


                    <div class="form-group">

                        <label for="my-role-in-team">
                            Seu Papel no Grupo
                        </label>

                        <input
                            type="text"
                            id="my-role-in-team"
                            required
                            placeholder="Ex: Líder / Desenvolvedor"
                        >

                    </div>


                    <button
                        type="submit"
                        class="btn-primary"
                    >
                        Criar Grupo
                    </button>

                </form>
            `;
        }

    } catch (error) {

        alert(
            `Erro ao carregar grupo: ${error.message}`
        );
    }
}


// =========================================================
// ALUNOS DISPONÍVEIS PARA GRUPO
// =========================================================

async function getAvailableStudentsOptions(
    teams
) {

    const students =
        await apiRequest(
            "/students"
        );


    const groupedEmails =
        teams.flatMap(
            team =>
                team.members.map(
                    member =>
                        member.email
                )
        );


    const available =
        students.filter(
            student =>
                !groupedEmails.includes(
                    student.email
                )
        );


    if (
        available.length === 0
    ) {

        return `
            <option value="">
                Nenhum aluno disponível
            </option>
        `;
    }


    return available
        .map(
            student => `
                <option
                    value="${escapeHtml(student.email)}"
                >
                    ${escapeHtml(student.name)}
                    (${escapeHtml(student.email)})
                </option>
            `
        )
        .join("");
}


// =========================================================
// CRIAR GRUPO
// =========================================================

async function handleCreateTeam(e) {

    e.preventDefault();


    const data = {

        name:
            document.getElementById(
                "new-team-name"
            ).value.trim(),

        student_email:
            currentUser.email,

        role:
            document.getElementById(
                "my-role-in-team"
            ).value.trim()
    };


    try {

        await apiRequest(
            "/teams",
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        data
                    )
            }
        );


        await renderStudentDashboard();

    } catch (error) {

        alert(
            error.message
        );
    }
}


// =========================================================
// ADICIONAR MEMBRO AO GRUPO
// =========================================================

async function handleAddMember(
    e,
    teamId
) {

    e.preventDefault();


    const email =
        document.getElementById(
            "add-member-email"
        ).value;


    const role =
        document.getElementById(
            "add-member-role"
        ).value.trim();


    if (
        !email
    ) {

        alert(
            "Nenhum aluno disponível."
        );

        return;
    }


    const data = {
        email,
        role
    };


    try {

        await apiRequest(
            `/teams/${teamId}/members`,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        data
                    )
            }
        );


        await renderStudentDashboard();

    } catch (error) {

        alert(
            error.message
        );
    }
}


// =========================================================
// ALUNO - ATIVIDADES
// =========================================================

async function renderStudentTasks() {

    try {

        const tasks =
            await apiRequest(
                "/tasks"
            );


        const tasksList =
            document.getElementById(
                "student-tasks-list"
            );


        const selectTask =
            document.getElementById(
                "submit-task-id"
            );


        if (
            tasks.length === 0
        ) {

            tasksList.innerHTML =
                "<p>Nenhuma atividade cadastrada.</p>";

        } else {

            tasksList.innerHTML =
                "";
        }


        selectTask.innerHTML = `
            <option value="">
                Selecione uma opção...
            </option>
        `;


        tasks.forEach(
            task => {

                tasksList.innerHTML += `
                    <div class="item-card">

                        <h4>

                            ${escapeHtml(task.title)}

                            <span class="badge">
                                ${escapeHtml(task.type)}
                            </span>

                        </h4>

                        <p>
                            ${escapeHtml(task.desc)}
                        </p>

                    </div>
                `;


                selectTask.innerHTML += `
                    <option
                        value="${task.id}"
                    >
                        ${escapeHtml(task.title)}
                        (${escapeHtml(task.type)})
                    </option>
                `;
            }
        );

    } catch (error) {

        alert(
            `Erro ao carregar atividades: ${error.message}`
        );
    }
}


// =========================================================
// ALUNO - ENVIAR TRABALHO
// =========================================================

async function handleSubmitWork(e) {

    e.preventDefault();


    const taskId =
        document.getElementById(
            "submit-task-id"
        ).value;


    if (
        !taskId
    ) {

        alert(
            "Selecione uma atividade."
        );

        return;
    }


    const data = {

        task_id:
            Number(taskId),

        student_email:
            currentUser.email,

        link:
            document.getElementById(
                "submit-link"
            ).value.trim(),

        notes:
            document.getElementById(
                "submit-notes"
            ).value.trim()
    };


    try {

        await apiRequest(
            "/submissions",
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        data
                    )
            }
        );


        alert(
            "Trabalho/Atividade enviado com sucesso!"
        );


        e.target.reset();


        await renderStudentTasks();

    } catch (error) {

        alert(
            error.message
        );
    }
}