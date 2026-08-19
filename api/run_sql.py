import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

conn = psycopg.connect(
    host=os.getenv("POSTGRES_HOST"),
    port=os.getenv("POSTGRES_PORT"),
    dbname=os.getenv("POSTGRES_DB"),
    user=os.getenv("POSTGRES_USER"),
    password=os.getenv("POSTGRES_PASSWORD"),
)

with open("create_tables.sql", "r", encoding="utf-8") as file:
    sql = file.read()

try:
    with conn.cursor() as cursor:
        for statement in sql.split(";"):
            statement = statement.strip()

            if statement:
                cursor.execute(statement)

    conn.commit()
    print("Tabelas criadas com sucesso!")

except Exception as e:
    conn.rollback()
    print("Erro ao criar tabelas:")
    print(e)

finally:
    conn.close()