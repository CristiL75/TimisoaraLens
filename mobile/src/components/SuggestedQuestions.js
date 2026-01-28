import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Suggested Questions Component
 * Displays LLM-generated follow-up questions based on RAG response
 */
const SuggestedQuestions = ({ questions, onSelectQuestion, loading = false }) => {
  if (!questions || questions.length === 0 || loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore more:</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {questions.map((question, index) => (
          <TouchableOpacity
            key={index}
            style={styles.questionButton}
            onPress={() => onSelectQuestion(question)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="lightbulb-on" 
              size={16} 
              color="#1863dc"
              style={styles.icon}
            />
            <Text style={styles.questionText} numberOfLines={2}>
              {question}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollView: {
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  questionButton: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e8ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
    minWidth: 140,
    maxWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    flexShrink: 0,
  },
  questionText: {
    fontSize: 13,
    color: '#1863dc',
    fontWeight: '500',
    flex: 1,
  },
});

export default SuggestedQuestions;
