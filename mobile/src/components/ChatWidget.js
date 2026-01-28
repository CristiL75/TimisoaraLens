import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  Portal,
  Card,
  Text,
  IconButton,
  Button,
  FAB,
} from 'react-native-paper';
import { ragAPI } from '../services/api';
import SuggestedQuestions from './SuggestedQuestions';

/**
 * Floating chatbot widget with RAG integration.
 * Connects to backend /rag/query endpoint for intelligent responses.
 */
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      from: 'bot',
      text: 'Salut! Eu sunt asistentul CityLens. Întreabă-mă orice despre Timișoara.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const trimmedInput = useMemo(() => input.trim(), [input]);

  const handleSend = async () => {
    if (!trimmedInput) return;
    
    const userMessage = {
      id: `u-${Date.now()}`,
      from: 'user',
      text: trimmedInput,
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Build conversation history (exclude welcome message) for context
    const conversationHistory = messages
      .filter((msg) => msg.id !== 'welcome') // Don't include welcome in history
      .map((msg) => ({
        role: msg.from === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }))
      .concat({ role: 'user', content: trimmedInput }); // Add current query

    // Query RAG endpoint with conversation context
    const result = await ragAPI.query(trimmedInput, conversationHistory, 5);

    console.log('RAG Result:', result); // DEBUG

    if (result.success) {
      const answerText = result.data.answer || '(răspuns gol)';
      console.log('Answer text:', answerText); // DEBUG
      const botMessage = {
        id: `b-${Date.now()}`,
        from: 'bot',
        text: answerText,
        sources: result.data.sources,
        suggestedQuestions: result.data.suggested_questions || [],
      };
      setMessages((prev) => [...prev, botMessage]);
    } else {
      const errorMessage = {
        id: `b-${Date.now()}`,
        from: 'bot',
        text: `Scuze, am o problemă: ${result.error}. Încearcă mai târziu.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const handleSelectSuggestedQuestion = (question) => {
    setInput(question);
  };

  const renderMessageText = (text) => {
    const parts = text
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    return parts.map((p, idx) => (
      <Text key={idx} style={styles.bubbleText}>
        {p}
      </Text>
    ));
  };

  return (
    <Portal>
      {isOpen && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.popupWrapper}
        >
          <Card style={styles.popup} elevation={4}>
            <Card.Title
              title="Chat CityLens"
              subtitle="Asistent inteligent"
              right={(props) => (
                <IconButton
                  {...props}
                  icon="close"
                  onPress={toggleOpen}
                  accessibilityLabel="Închide chat"
                />
              )}
            />
            <View style={styles.cardContentWrapper}>
              <ScrollView
                style={styles.messagesScroll}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg) => (
                  <View key={msg.id}>
                    <View
                      style={[
                        styles.bubble,
                        msg.from === 'user' ? styles.userBubble : styles.botBubble,
                      ]}
                    >
                      {renderMessageText(msg.text)}
                      {msg.sources && msg.sources.length > 0 && (
                        <View style={styles.sourcesContainer}>
                          <Text style={styles.sourcesLabel}>Surse:</Text>
                          {msg.sources.slice(0, 2).map((source, idx) => (
                            <Text key={idx} style={styles.sourceItem}>
                              • {source.heading} ({source.source})
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                    {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <SuggestedQuestions
                        questions={msg.suggestedQuestions}
                        onSelectQuestion={handleSelectSuggestedQuestion}
                      />
                    )}
                  </View>
                ))}
                {isLoading && (
                  <View style={styles.loadingBubble}>
                    <ActivityIndicator size="small" color="#6200ee" />
                    <Text style={styles.loadingText}>Se gândește...</Text>
                  </View>
                )}
              </ScrollView>
            </View>
            <Card.Actions style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Scrie un mesaj..."
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!isLoading}
              />
              <Button
                mode="contained"
                onPress={handleSend}
                disabled={!trimmedInput || isLoading}
              >
                Trimite
              </Button>
            </Card.Actions>
          </Card>
        </KeyboardAvoidingView>
      )}

      <FAB
        icon={isOpen ? 'chat-remove-outline' : 'chat-processing-outline'}
        label={isOpen ? 'Ascunde' : 'Chat'}
        style={styles.fab}
        onPress={toggleOpen}
        accessibilityLabel="Deschide chatul CityLens"
      />
    </Portal>
  );
}

const styles = StyleSheet.create({
  popupWrapper: {
    position: 'absolute',
    right: 12,
    bottom: 96,
    left: 12,
    alignItems: 'flex-end',
  },
  popup: {
    width: '90%',
    maxHeight: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  cardContentWrapper: {
    overflow: 'hidden',
    maxHeight: 280,
    paddingHorizontal: 4,
  },
  messagesScroll: {
    width: '100%',
  },
  messagesContent: {
    paddingVertical: 4,
  },
  bubble: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  userBubble: {
    backgroundColor: '#E8F0FE',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  botBubble: {
    backgroundColor: '#F1F1F1',
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  bubbleText: {
    fontSize: 14,
    color: '#000',
  },
  sourcesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  sourcesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  sourceItem: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F1F1',
    borderRadius: 12,
    padding: 10,
    alignSelf: 'flex-start',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#666',
  },
  inputRow: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 42,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginRight: 8,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
});
