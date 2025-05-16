import asyncio
import random
from sqlalchemy import select, update

from src.db.models import Transaction
from src.db.session import Session


import sys
import os

# Ajoute le dossier racine du projet au sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


def generate_numeric_reference():
    return f"{random.randint(10000000, 99999999)}"

async def update_references():
    async with Session() as session:
        # Récupérer toutes les transactions
        result = await session.execute(select(Transaction))
        transactions = result.scalars().all()

        used_refs = set()

        for tx in transactions:
            # Génère une référence unique à 8 chiffres
            new_ref = generate_numeric_reference()
            while new_ref in used_refs:
                new_ref = generate_numeric_reference()

            used_refs.add(new_ref)
            tx.reference = new_ref  # mettre à jour l'objet

        await session.commit()
        print(f"{len(transactions)} références mises à jour.")

if __name__ == "__main__":
    asyncio.run(update_references())
