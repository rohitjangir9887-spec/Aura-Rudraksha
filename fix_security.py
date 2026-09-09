import re

with open("server/controllers/auraAiController.js", "r") as f:
    code = f.read()

target = '''    if (isDbConnected()) {
      try {
        existingConvDoc = await AuraAIConversation.findOne({ $or: [{ id: targetConversationId }, { conversationId: targetConversationId }] }).lean();
      } catch (_) {}
    }'''

replacement = '''    if (isDbConnected()) {
      try {
        existingConvDoc = await AuraAIConversation.findOne({ $or: [{ id: targetConversationId }, { conversationId: targetConversationId }] }).lean();
        
        // SECURITY AUTHORIZATION CHECK: User A cannot access User B's Kundli/Conversation
        if (existingConvDoc) {
          const isOwner = (effectiveUserId !== "guest" && existingConvDoc.userId === effectiveUserId) || 
                          (effectiveUserId === "guest" && existingConvDoc.guestSessionId === effectiveGuestSessionId);
          if (!isOwner) {
            console.warn(`[Aura AI Security] Unauthorized conversation access blocked. ConvId: ${targetConversationId}, Requester: ${effectiveUserId}`);
            existingConvDoc = null; // Deny access to this document
          }
        }
      } catch (_) {}
    }'''

code = code.replace(target, replacement)

with open("server/controllers/auraAiController.js", "w") as f:
    f.write(code)
