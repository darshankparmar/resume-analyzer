# Custom instructions for FastAPI project

## Project Context

This project is a web API built with FastAPI and Pydantic for data validation. We use SQLAlchemy for database interactions.

## Coding Style

- Prefer type hints for all function parameters and return values.
- Use `async def` for all API endpoints to leverage FastAPI's asynchronous capabilities.
- Organize API routes into separate router files (e.g., `routers/users.py`, `routers/items.py`).

## Data Models

- Pydantic models should be defined clearly, including field types and default values where applicable.
- Use `Field` for more complex validation or metadata.

## Error Handling

- Return `HTTPException` for API errors with appropriate status codes and detail messages.
