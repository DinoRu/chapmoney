from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from typing import List

from sqlalchemy.orm import aliased

from src.auth.permission import admin_required
from src.db.models import Fee, Country
from src.db.session import get_session
from src.schemas.fees import FeeView, CreateFee, UpdateFee, FeeWithCountryName

router = APIRouter()


@router.post("/", response_model=FeeView, status_code=status.HTTP_201_CREATED, dependencies=[Depends(admin_required)])
async def create_fee(fee_data: CreateFee, session: AsyncSession = Depends(get_session)):
	query = select(Fee).where(
		Fee.from_country_id == str(fee_data.from_country_id),
		Fee.to_country_id == str(fee_data.to_country_id)
	)
	result = await session.execute(query)
	existing_fee = result.scalars().first()

	if existing_fee:
		raise HTTPException(
			status_code=400,
			detail="Fee already exists for this from_country_id and to_country_id"
		)

	fee = Fee(**fee_data.dict())
	session.add(fee)
	await session.commit()
	await session.refresh(fee)
	return fee


@router.get("/", response_model=List[FeeView])
async def get_all_fees(session: AsyncSession = Depends(get_session)):
	result = await session.execute(select(Fee))
	fees = result.scalars().all()
	return fees



@router.get("/all-with-names", status_code=status.HTTP_200_OK, response_model=List[FeeWithCountryName])
async def get_all_fees_with_country_name(session: AsyncSession = Depends(get_session)):

	FromCountry = aliased(Country)
	ToCountry = aliased(Country)

	# Construction de la requête avec jointures
	query = (
		select(
			Fee.fee,
			FromCountry.name.label("from_country"),
			ToCountry.name.label("to_country")
		)
		.join(FromCountry, Fee.from_country_id == FromCountry.id)
		.join(ToCountry, Fee.to_country_id == ToCountry.id)
	)

	result = await session.execute(query)

	fees_data = result.all()

	# Transformation des résultats
	return [
		{
			"from_country": row.from_country,
			"to_country": row.to_country,
			"fee": row.fee
		}
		for row in fees_data
	]



@router.get("/by-countries", response_model=List[FeeView])
async def get_fee_by_countries(
		from_country_id: UUID,
		to_country_id: UUID,
		session: AsyncSession = Depends(get_session)
):
	result = await session.execute(
		select(Fee)
		.where(
			Fee.from_country_id == from_country_id,
			Fee.to_country_id == to_country_id
		)
	)
	fees = result.scalars().all()

	if not fees:
		raise HTTPException(
			status_code=404,
			detail="Aucun frais trouvé pour cette paire de pays"
		)

	return fees




@router.get("/{id}", response_model=FeeView)
async def get_fee(id: UUID, session: AsyncSession = Depends(get_session)):
	result = await session.execute(select(Fee).where(Fee.id == id))
	fee = result.scalars().first()
	if not fee:
		raise HTTPException(status_code=404, detail="Fee not found")
	return fee


@router.put("/{id}", response_model=FeeView, dependencies=[Depends(admin_required)])
async def update_fee(id: UUID, fee_data: UpdateFee, session: AsyncSession = Depends(get_session)):
	result = await session.execute(select(Fee).where(Fee.id == id))
	fee = result.scalars().first()
	if not fee:
		raise HTTPException(status_code=404, detail="Fee not found")

	fee.fee = fee_data.fee
	await session.commit()
	await session.refresh(fee)
	return fee


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_required)])
async def delete_fee(id: UUID, session: AsyncSession = Depends(get_session)):
	result = await session.execute(select(Fee).where(Fee.id == id))
	fee = result.scalars().first()
	if not fee:
		raise HTTPException(status_code=404, detail="Fee not found")

	await session.delete(fee)
	await session.commit()

