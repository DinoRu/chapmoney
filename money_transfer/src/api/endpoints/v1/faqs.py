import uuid
from typing import List

from fastapi import APIRouter, status, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio.session import AsyncSession

from src.auth.permission import admin_required
from src.db.models import FAQs
from src.db.session import get_session
from src.schemas.faqs import CreateFAQ, ReadFAQ

router = APIRouter()


async def get_faq_or_404(id: uuid.UUID, session: AsyncSession = Depends(get_session)):
	stmt = select(FAQs).where(FAQs.id == id)
	result = await session.execute(stmt)
	faq = result.scalar_one_or_none()
	if not faq:
		raise HTTPException(status_code=404, detail="FAQ not found!")
	return faq


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=ReadFAQ, dependencies=[Depends(admin_required)])
async def create_faq(
		faq_data: CreateFAQ,
		session: AsyncSession = Depends(get_session)
):
	faq_data_dict = faq_data.model_dump()
	faq = FAQs(**faq_data_dict)

	session.add(faq)
	await session.commit()
	await session.refresh(faq)

	return faq


@router.get('/', status_code=status.HTTP_200_OK, response_model=List[ReadFAQ])
async def get_faqs(session: AsyncSession = Depends(get_session)):
	stmt = select(FAQs);
	results = await session.execute(stmt)
	faqs = results.scalars().all()
	return faqs


@router.get("/{id}", status_code=status.HTTP_200_OK, response_model=ReadFAQ)
async def get_faq(
		faq: ReadFAQ = Depends(get_faq_or_404)
):
	return faq
