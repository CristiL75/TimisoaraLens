import React, { useMemo, useState, useCallback } from 'react';
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

const CONVERSATION_CONTEXT_MESSAGES = 6;

// Fields carried forward so resolved IDs/dates survive beyond the context window
const BOOKING_CTX_FIELDS = [
  'provider_id', 'provider_name', 'service_id', 'employee_id',
  'table_id', 'room_id', 'car_id',
  'booking_date', 'start_time', 'end_time', 'duration_minutes',
  'rental_end_date', 'rental_end_time', 'party_size',
  'customer_name', 'customer_email', 'customer_phone',
];

/**
 * Floating chatbot widget with RAG integration.
 * Connects to backend /rag/query endpoint for intelligent responses.
 */
export default function ChatWidget() {
  const navigation = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      from: 'bot',
      text: 'Salut! Eu sunt asistentul CityLens. Întreabă-mă orice despre Timișoara.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  // Booking context persisted across turns so resolved IDs/dates are re-sent
  // even after the original message scrolls out of the context window.
  const [pendingBookingCtx, setPendingBookingCtx] = useState({});

  const trimmedInput = useMemo(() => input.trim(), [input]);

  const buildConversationHistory = (historyMessages, currentText) => {
    const recentMessages = (historyMessages || [])
      .filter((msg) => msg.id !== 'welcome')
      .slice(-CONVERSATION_CONTEXT_MESSAGES)
      .map((msg) => ({
        role: msg.from === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

    return [...recentMessages, { role: 'user', content: currentText }];
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

    const conversationHistory = buildConversationHistory(messages, trimmedInput);
    const assistantPayload = {
      message: trimmedInput,
      conversation_history: conversationHistory,
      context_candidates: extractContextCandidates(messages),
      // Re-inject previously resolved booking fields so context is never lost
      ...pendingBookingCtx,
    };

    const assistantResult = await bookingsAPI.bookingAssistant(assistantPayload);
    console.log('Booking Assistant Result:', assistantResult);
    if (assistantResult.success && assistantResult.data?.handled) {
      // Update persisted booking context with any newly resolved fields
      const responseData = assistantResult.data || {};
      const newCtx = {};
      BOOKING_CTX_FIELDS.forEach((field) => {
        if (responseData[field] != null) {
          newCtx[field] = responseData[field];
        }
      });
      if (Object.keys(newCtx).length > 0) {
        setPendingBookingCtx((prev) => ({ ...prev, ...newCtx }));
      }
      // Clear booking context once a booking is successfully created or cancelled
      if (responseData.booking_id && !responseData.missing_fields?.length) {
        setPendingBookingCtx({});
      }

      let assistantText = responseData.message || 'Am procesat cererea de rezervare.';

      const assistantMessage = {
        id: `b-${Date.now()}`,
        from: 'bot',
        text: assistantText,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      return;
    }

    if (!assistantResult.success) {
      console.log('Booking assistant fallback reason: request failed', assistantResult.error);
    } else if (!assistantResult.data?.handled) {
      console.log('Booking assistant fallback reason: handled=false', assistantResult.data);
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

  const handleSelectSuggestedQuestion = useCallback((question) => {
    setInput(question);
  }, []);

  const handleClearConversation = () => {
    setMessages([
      {
        id: 'welcome',
        from: 'bot',
        text: 'Salut! Eu sunt asistentul CityLens. Întreabă-mă orice despre Timișoara.',
      },
    ]);
    setInput('');
    setPendingBookingCtx({});
  };

  const renderMessageText = useCallback((text) => {
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
  }, []);

  const renderedMessages = useMemo(() => (
    messages.map((msg) => {
      const hasListingSources = msg.sources?.some((s) => s.listing);
      const hasServiceSources = msg.sources?.some((s) => s.service);
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
                {hasListingSources && (
                  <View style={styles.listingsContainer}>
                    {msg.sources
                      .filter((s) => s.listing)
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
                      .filter((s) => s.service)
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
    })
  ), [messages, navigation, renderMessageText, handleSelectSuggestedQuestion]);

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
                {renderedMessages}
                {isLoading && (
                  <View style={styles.loadingBubble}>
                    <ActivityIndicator size="small" color="#6200ee" />
                    <Text style={styles.loadingText}>Se gândește...</Text>
                  </View>
                )}
              </ScrollView>
            </View>
            <View style={[styles.inputRow, isInputFocused && styles.inputRowFocused]}>
              <View style={[styles.inputContainer, isInputFocused && styles.inputContainerFocused]}>
                <TextInput
                  style={styles.input}
                  placeholder="Scrie un mesaj..."
                  placeholderTextColor="#9AA0A6"
                  value={input}
                  onChangeText={setInput}
                  multiline
                  textAlignVertical="top"
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  returnKeyType="default"
                  blurOnSubmit={false}
                  scrollEnabled
                  editable={!isLoading}
                />
              </View>
              <Button
                mode="contained"
                onPress={handleSend}
                disabled={!trimmedInput || isLoading}
                style={styles.sendButton}
                contentStyle={styles.sendButtonContent}
                labelStyle={styles.sendButtonLabel}
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
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    backgroundColor: '#FFFFFF',
  },
  inputRowFocused: {
    borderTopColor: '#E4E7EC',
  },
  inputContainer: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderColor: '#D0D5DD',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'flex-start',
  },
  inputContainerFocused: {
    borderColor: '#6200EE',
    backgroundColor: '#FFFFFF',
  },
  input: {
    minHeight: 44,
    maxHeight: 104,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    lineHeight: 20,
    color: '#101828',
  },
  sendButton: {
    height: 46,
    justifyContent: 'center',
    borderRadius: 12,
    minWidth: 86,
    alignSelf: 'flex-end',
  },
  sendButtonContent: {
    height: 46,
    paddingHorizontal: 10,
  },
  sendButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
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
