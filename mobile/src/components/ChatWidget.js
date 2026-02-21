import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Portal,
  Card,
  Text,
  IconButton,
  Button,
  FAB,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { ragAPI, bookingsAPI } from '../services/api';
import SuggestedQuestions from './SuggestedQuestions';

const BOOKING_KEYWORDS = [
  'rezerv', 'rezervare', 'book', 'booking', 'programare', 'program',
  'disponibil', 'disponibilitate', 'slot', 'anulez', 'anuleaza', 'cancel',
  'serviciu', 'servicii', 'service', 'services', 'provider',
  'ce servicii', 'ce oferi', 'ce aveti', 'ce aveți', 'ce pot rezerva',
  'restaurant', 'pub', 'club', 'masa', 'table',
  'salon', 'barber', 'spa', 'masaj', 'workshop', 'tur ghidat',
  'inchiriere auto', 'rent a car', 'room', 'spatiu',
];

/**
 * Floating chatbot widget with RAG integration.
 * Connects to backend /rag/query endpoint for intelligent responses.
 */
export default function ChatWidget() {
  const navigation = useNavigation();
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

  const shouldTryBookingAssistant = (text) => {
    const normalized = (text || '').toLowerCase();
    return BOOKING_KEYWORDS.some((keyword) => normalized.includes(keyword));
  };

  const extractContextCandidates = (historyMessages) => {
    const reversed = [...historyMessages].reverse();
    const latestWithSources = reversed.find((msg) => Array.isArray(msg.sources) && msg.sources.length > 0);
    if (!latestWithSources) return [];

    return latestWithSources.sources
      .map((source) => {
        const service = source?.service;
        if (!service) return null;
        const provider = service.provider || {};
        return {
          provider_id: provider.id || provider._id || service.provider_id || (service.entity_type === 'provider' ? service.id : null),
          provider_name: provider.name || service.provider_name || null,
          service_id: service.entity_type === 'service' ? service.id : null,
          service_name: service.name || null,
        };
      })
      .filter(Boolean)
      .slice(0, 6);
  };

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

    if (shouldTryBookingAssistant(trimmedInput)) {
      const assistantPayload = {
        message: trimmedInput,
        conversation_history: conversationHistory,
        context_candidates: extractContextCandidates(messages),
      };

      const assistantResult = await bookingsAPI.bookingAssistant(assistantPayload);
      if (assistantResult.success && assistantResult.data?.handled) {
        const missingFields = assistantResult.data.missing_fields || [];
        const suggestions = assistantResult.data.suggestions || [];
        let assistantText = assistantResult.data.message || 'Am procesat cererea de rezervare.';

        if (missingFields.length > 0) {
          assistantText += `\n\nDate lipsă: ${missingFields.join(', ')}`;
        }
        if (suggestions.length > 0) {
          assistantText += `\n\nSugestii:\n- ${suggestions.join('\n- ')}`;
        }

        const assistantMessage = {
          id: `b-${Date.now()}`,
          from: 'bot',
          text: assistantText,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }
    }

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

  const handleClearConversation = () => {
    setMessages([
      {
        id: 'welcome',
        from: 'bot',
        text: 'Salut! Eu sunt asistentul CityLens. Întreabă-mă orice despre Timișoara.',
      },
    ]);
    setInput('');
  };

  const renderMessageText = (text) => {
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return <View key={`blank-${idx}`} style={styles.blankLine} />;
      }

      const isTitle = trimmed.startsWith('**') && trimmed.endsWith('**');
      const content = isTitle ? trimmed.slice(2, -2) : trimmed;
      const isBullet = content.startsWith('- ');

      if (isBullet) {
        return (
          <View key={`bullet-${idx}`} style={styles.bulletRow}>
            <Text style={styles.bulletMarker}>•</Text>
            <Text style={styles.bulletText}>{content.slice(2)}</Text>
          </View>
        );
      }

      return (
        <Text key={`line-${idx}`} style={[styles.bubbleText, isTitle && styles.bubbleTitle]}>
          {content}
        </Text>
      );
    });
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
              titleStyle={styles.headerTitle}
              subtitleStyle={styles.headerSubtitle}
              right={(props) => (
                <View style={{ flexDirection: 'row' }}>
                  <IconButton
                    {...props}
                    icon="delete-outline"
                    onPress={handleClearConversation}
                    accessibilityLabel="Șterge conversația"
                  />
                  <IconButton
                    {...props}
                    icon="close"
                    onPress={toggleOpen}
                    accessibilityLabel="Închide chat"
                  />
                </View>
              )}
            />
            <View style={styles.cardContentWrapper}>
              <ScrollView
                style={styles.messagesScroll}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg) => {
                  const hasListingSources = msg.sources?.some(s => s.listing);
                  const hasServiceSources = msg.sources?.some(s => s.service);
                  return (
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
                          {/* Afișează carduri apartamente dacă există */}
                          {hasListingSources && (
                            <View style={styles.listingsContainer}>
                              {msg.sources
                                .filter(s => s.listing)
                                .map((source, idx) => {
                                  const listing = source.listing;
                                  const firstImage = listing.images?.[0];
                                  return (
                                    <TouchableOpacity
                                      key={idx}
                                      style={styles.listingCard}
                                      onPress={() => {
                                        navigation.navigate('ListingDetail', {
                                          listingId: listing.id || listing._id,
                                        });
                                      }}
                                    >
                                      {firstImage && (
                                        <Image
                                          source={{ uri: firstImage }}
                                          style={styles.listingImage}
                                          resizeMode="cover"
                                        />
                                      )}
                                      <View style={styles.listingInfo}>
                                        <Text style={styles.listingTitle}>
                                          {listing.title || 'Apartament'}
                                        </Text>
                                        <Text style={styles.listingPrice}>
                                          {listing.price_per_night} lei/noapte
                                        </Text>
                                        <Text style={styles.listingAddress}>
                                          📍 {listing.location?.address || listing.location?.city}
                                        </Text>
                                      </View>
                                    </TouchableOpacity>
                                  );
                                })}
                            </View>
                          )}
                          {hasServiceSources && (
                            <View style={styles.listingsContainer}>
                              {msg.sources
                                .filter(s => s.service)
                                .map((source, idx) => {
                                  const service = source.service;
                                  const firstImage = service.image;
                                  const addressLabel = service.address || service.city || 'Timișoara';
                                  const subtitle = service.category || service.provider_name || 'Serviciu local';
                                  const provider = service.provider;
                                  const providerId = provider?.id || provider?._id || service.provider_id || (service.entity_type === 'provider' ? service.id : null);
                                  return (
                                    <TouchableOpacity
                                      key={`service-${idx}`}
                                      style={styles.listingCard}
                                      onPress={async () => {
                                        if (providerId) {
                                          const providerResult = await bookingsAPI.getProvider(providerId);
                                          if (providerResult.success && providerResult.data) {
                                            navigation.navigate('ProviderDetail', {
                                              provider: providerResult.data,
                                              isOwner: false,
                                            });
                                            return;
                                          }
                                        }

                                        if (provider && (provider.id || provider._id || provider.name)) {
                                          navigation.navigate('ProviderDetail', {
                                            provider,
                                            isOwner: false,
                                          });
                                          return;
                                        }

                                        navigation.navigate('Services');
                                      }}
                                    >
                                      {firstImage && (
                                        <Image
                                          source={{ uri: firstImage }}
                                          style={styles.listingImage}
                                          resizeMode="cover"
                                        />
                                      )}
                                      <View style={styles.listingInfo}>
                                        <Text style={styles.listingTitle}>
                                          {service.name || 'Serviciu'}
                                        </Text>
                                        <Text style={styles.listingPrice}>
                                          {subtitle}
                                        </Text>
                                        <Text style={styles.listingAddress}>
                                          📍 {addressLabel}
                                        </Text>
                                      </View>
                                    </TouchableOpacity>
                                  );
                                })}
                            </View>
                          )}
                          {/* Afișează surse normale dacă nu sunt apartamente */}
                          {!hasListingSources && !hasServiceSources && (
                            <>
                              <Text style={styles.sourcesLabel}>Surse:</Text>
                              {msg.sources.slice(0, 2).map((source, idx) => (
                                <Text key={idx} style={styles.sourceItem}>
                                  • {source.heading} ({source.source})
                                </Text>
                              ))}
                            </>
                          )}
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
                  );
                })}
                {isLoading && (
                  <View style={styles.loadingBubble}>
                    <ActivityIndicator size="small" color="#6200ee" />
                    <Text style={styles.loadingText}>Se gândește...</Text>
                  </View>
                )}
              </ScrollView>
            </View>
            <View style={styles.inputRow}>
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
                style={styles.sendButton}
              >
                Trimite
              </Button>
            </View>
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
    alignItems: 'center',
  },
  popup: {
    width: '95%',
    maxHeight: 520,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  cardContentWrapper: {
    overflow: 'hidden',
    maxHeight: 360,
    paddingHorizontal: 10,
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
  blankLine: {
    height: 6,
  },
  bubbleTitle: {
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 2,
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
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  bulletMarker: {
    marginRight: 6,
    color: '#1f1f1f',
  },
  bulletText: {
    flex: 1,
    color: '#1f1f1f',
    lineHeight: 20,
  },
  bubbleText: {
    fontSize: 15,
    color: '#000',
  },
  sourcesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },  listingsContainer: {
    marginTop: 8,
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  listingImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  listingInfo: {
    padding: 10,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6200ee',
    marginBottom: 4,
  },
  listingAddress: {
    fontSize: 12,
    color: '#666',
  },  sourcesLabel: {
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 48,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 8,
    fontSize: 15,
  },
  sendButton: {
    height: 48,
    justifyContent: 'center',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
});
