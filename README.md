# RxAssist

This repository contains the data pipeline and backend services for RxAssist.

## Project Structure

### 1. `ETL/` (Extract, Transform, Load)
This directory handles the data processing and database schema definitions.
* **`db_schema.md`**: Contains the SQL schema definitions for the Supabase database. It includes three main tables used for storing Medicare/prescription data:
  * `formulary`: Drug formulary details (RXCUI, NDC, tier levels, limits).
  * `plans`: Plan and contract information.
  * `costs`: Cost-sharing and pricing details.
* **`parsing_data_to_db.ipynb`**: A Jupyter Notebook containing the ETL logic to process raw data files and load them into the Supabase database.

### 2. `app/` (FastAPI Backend)
The backend is built with FastAPI and provides endpoints to interface with the database.
* **`main.py`**: The main entry point for the API. It connects to the Supabase client and provides several endpoints:
  * `GET /`: Health check / welcome message.
  * `GET /items/{item_id}`: Example parameterized endpoint.
  * `POST /submit`: Example endpoint for data submission.
  * `POST /check_for_updates`: Checks for updates/differences in formulary tiers over a date range for specific RXCUIs and Formulary IDs.

### 3. `requirements.txt`
Contains the Python dependencies required to run the project:
* `fastapi` & `uvicorn` (Backend framework & server)
* `supabase` (Database client)
* `pandas` (Data manipulation for ETL)
* `python-dotenv` (Environment variable management)

---

## Getting Started

### Prerequisites
1. Ensure you have Python 3.8+ installed.
2. Ensure you have a `.env` file in the `RxAssist` directory with your Supabase credentials:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Setup & Run
Run the following commands from the `RxAssist` directory to start the backend:

**1. Install Dependencies**
```bash
pip install -r requirements.txt
```

**2. Start the FastAPI Server**
```bash
uvicorn app.main:app --reload
```

The server will start locally at `http://127.0.0.1:8000`. 
You can access the interactive API documentation (Swagger UI) at `http://127.0.0.1:8000/docs`.
