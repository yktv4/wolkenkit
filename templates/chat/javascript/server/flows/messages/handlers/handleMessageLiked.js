'use strict';

const handleMessageLiked = {
  isRelevant ({ fullyQualifiedName }) {
    return fullyQualifiedName === 'communication.message.liked';
  },

  async handle (domainEvent, { infrastructure }) {
    if (Array.isArray(infrastructure.tell.viewStore.messages)) {
      const messageToUpdate = infrastructure.tell.viewStore.messages.find(
        message => message.id === domainEvent.aggregateIdentifier.id
      );

      messageToUpdate.likes = domainEvent.data.likes;

      return;
    }

    await infrastructure.tell.viewStore.messages.updateOne(
      { id: domainEvent.aggregateIdentifier.id },
      { $set: { likes: domainEvent.data.likes }}
    );
  }
};

module.exports = { handleMessageLiked };
