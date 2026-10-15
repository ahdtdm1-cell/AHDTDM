import pytest
from app.models import User, Post, PostReaction, PostComment, Conversation, ConversationParticipant, Message, MessageReaction, Friendship, Notification
from app.database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_create_social_and_messenger_models(db_session):
    u1 = User(username="user1", hashed_password="pw1", display_name="User One")
    u2 = User(username="user2", hashed_password="pw2", display_name="User Two")
    db_session.add_all([u1, u2])
    db_session.commit()

    # Friendship
    f = Friendship(user_id=u1.id, friend_id=u2.id, status="accepted")
    db_session.add(f)
    db_session.commit()

    # Post with Reaction and Comment
    post = Post(author_id=u1.id, content="First social post!", privacy="public")
    db_session.add(post)
    db_session.commit()

    reaction = PostReaction(post_id=post.id, user_id=u2.id, reaction_type="love")
    comment = PostComment(post_id=post.id, author_id=u2.id, content="Great post!")
    db_session.add_all([reaction, comment])
    db_session.commit()

    # Conversation and Message
    conv = Conversation(is_group=False)
    db_session.add(conv)
    db_session.commit()

    p1 = ConversationParticipant(conversation_id=conv.id, user_id=u1.id)
    p2 = ConversationParticipant(conversation_id=conv.id, user_id=u2.id)
    msg = Message(conversation_id=conv.id, sender_id=u1.id, content="Hello there!")
    db_session.add_all([p1, p2, msg])
    db_session.commit()

    msg_reaction = MessageReaction(message_id=msg.id, user_id=u2.id, emoji="❤️")
    notif = Notification(recipient_id=u1.id, actor_id=u2.id, type="post_reaction", reference_id=post.id, content="user2 loved your post")
    db_session.add_all([msg_reaction, notif])
    db_session.commit()

    assert post.author.username == "user1"
    assert len(post.reactions) == 1
    assert len(post.comments) == 1
    assert msg.sender.username == "user1"
    assert len(msg.reactions) == 1
    assert notif.actor.username == "user2"
