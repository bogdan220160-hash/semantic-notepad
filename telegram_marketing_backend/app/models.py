from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    api_id = Column(String, nullable=False)
    api_hash = Column(String, nullable=False)
    phone_number = Column(String, unique=True, nullable=False)
    session_string = Column(Text, nullable=True)  # Encrypted session
    proxy_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    warmup_enabled = Column(Boolean, default=False)
    warmup_last_run = Column(DateTime, nullable=True)
    health_status = Column(String, default='unknown') # alive, spam_block, flood_wait, banned, unknown
    last_health_check = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserList(Base):
    __tablename__ = "user_lists"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    users = Column(JSON, nullable=False)  # List of user objects/IDs
    created_at = Column(DateTime, default=datetime.utcnow)

class MessageTemplate(Base):
    __tablename__ = "message_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    media_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="draft")  # draft, running, paused, completed, stopped, scheduled
    config = Column(JSON, nullable=True)  # Stores delay, filters, etc.
    scheduled_for = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ABTest(Base):
    __tablename__ = "ab_tests"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="draft") # draft, running, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    variants = relationship("ABTestVariant", back_populates="test", cascade="all, delete-orphan")

class ABTestVariant(Base):
    __tablename__ = "ab_test_variants"
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("ab_tests.id"))
    template_id = Column(Integer, ForeignKey("message_templates.id"))
    weight = Column(Integer, default=50)
    sent_count = Column(Integer, default=0)
    reply_count = Column(Integer, default=0)
    
    test = relationship("ABTest", back_populates="variants")
    template = relationship("MessageTemplate")

class SendLog(Base):
    __tablename__ = "send_logs"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    account_id = Column(Integer, ForeignKey("accounts.id"))
    recipient = Column(String, nullable=False)
    status = Column(String, nullable=False)  # sent, failed, skipped
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class ApiToken(Base):
    __tablename__ = "api_tokens"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DripCampaign(Base):
    __tablename__ = "drip_campaigns"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    list_id = Column(Integer, ForeignKey("user_lists.id"))
    account_id = Column(Integer, ForeignKey("accounts.id")) # Account to send from
    status = Column(String, default="active") # active, paused, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    steps = relationship("DripStep", back_populates="campaign", order_by="DripStep.step_order", cascade="all, delete-orphan")
    progress = relationship("DripProgress", back_populates="campaign", cascade="all, delete-orphan")

class DripStep(Base):
    __tablename__ = "drip_steps"
    id = Column(Integer, primary_key=True, index=True)
    drip_campaign_id = Column(Integer, ForeignKey("drip_campaigns.id"))
    template_id = Column(Integer, ForeignKey("message_templates.id"))
    delay_minutes = Column(Integer, default=0) # Delay after previous step (or start)
    step_order = Column(Integer)
    
    campaign = relationship("DripCampaign", back_populates="steps")

class DripProgress(Base):
    __tablename__ = "drip_progress"
    id = Column(Integer, primary_key=True, index=True)
    drip_campaign_id = Column(Integer, ForeignKey("drip_campaigns.id"))
    user_data = Column(JSON) # Store user info (phone, username, etc.)
    current_step_order = Column(Integer, default=0)
    next_execution_time = Column(DateTime)
    status = Column(String, default="pending") # pending, completed, failed
    
    campaign = relationship("DripCampaign", back_populates="progress")

class WarmupLog(Base):
    __tablename__ = "warmup_logs"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    action = Column(String, nullable=False) # read, join, scroll
    details = Column(String, nullable=True) # e.g. "Joined channel @durov"
    timestamp = Column(DateTime, default=datetime.utcnow)

class ScraperLog(Base):
    __tablename__ = "scraper_logs"
    id = Column(Integer, primary_key=True, index=True)
    source_url = Column(String, nullable=False) # Group/Channel URL or ID
    users_scraped = Column(Integer, default=0)
    status = Column(String, default="success") # success, failed
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
