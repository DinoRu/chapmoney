from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.api.endpoints.v1 import healthcheck, currency, country, receiving_type, payment_method, transaction, fees, exchange_rates, faqs, \
    user

version = 'v1'
app = FastAPI(
    title="Money transfer",
    version=version,
    root_path="/api"
)

app.mount("/static", StaticFiles(directory='static'), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(healthcheck.router, tags=['Health Check'])
app.include_router(currency.router, prefix=f"/{version}/currency", tags=['Currency'])
# app.include_router(rates.router, prefix=f"/api/{version}/currency", tags=['Rate'])
app.include_router(country.router, prefix=f"/{version}/country", tags=['Country'])
app.include_router(receiving_type.router, prefix=f"/{version}/receiving-type", tags=['Receiving types'])
app.include_router(payment_method.router, prefix=f"/{version}/payment-type", tags=['Payment types'])
app.include_router(transaction.router, prefix=f"/{version}/transactions", tags=['Transactions'])
app.include_router(fees.router, prefix=f"/{version}/fees", tags=['Fees'])
app.include_router(exchange_rates.router, prefix=f"/{version}/exchange-rates", tags=['Exchange Rates'])
app.include_router(faqs.router, prefix=f"/{version}/faqs", tags=["FAQS"])
app.include_router(user.router, prefix=f"/{version}/users", tags=['Users'])



@app.get("/")
def home():
    return {"message": "Bienvenue sur l'API de conversion et de transfert d'argent"}
