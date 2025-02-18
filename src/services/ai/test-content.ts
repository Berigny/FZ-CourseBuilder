import { NvidiaAIProcessor } from '../../lib/nvidia';
import { aiMonitoring } from './monitoring';
import { applicationRules } from '../../config/rules';

const sampleEducationalContent = `
# Introduction to Machine Learning

## Overview
Machine learning is a subset of artificial intelligence that focuses on developing systems that can learn and improve from experience without being explicitly programmed. This introductory lesson covers the fundamental concepts and applications of machine learning.

## Key Concepts

### 1. Types of Machine Learning
- Supervised Learning
- Unsupervised Learning
- Reinforcement Learning

### 2. Core Components
1. Data Collection and Preparation
2. Feature Selection and Engineering
3. Model Selection and Training
4. Evaluation and Validation

## Applications
Machine learning has numerous real-world applications:
- Image and Speech Recognition
- Natural Language Processing
- Recommendation Systems
- Autonomous Vehicles
- Medical Diagnosis

## Getting Started
To begin your journey in machine learning:
1. Learn the mathematical foundations (statistics, linear algebra)
2. Master a programming language (Python is recommended)
3. Study fundamental algorithms
4. Practice with real datasets

## Best Practices
- Start with simple models
- Use cross-validation
- Monitor model performance
- Keep data quality high
- Document your work

## Resources
- Online Courses
- Technical Documentation
- Research Papers
- Community Forums

## Next Steps
After mastering these basics, you can explore:
- Deep Learning
- Neural Networks
- Advanced Algorithms
`;

export async function testEducationalContent() {
  console.log('Starting educational content test...');
  const startTime = Date.now();

  try {
    // Create a test file
    const testFile = new File(
      [sampleEducationalContent],
      'machine-learning-intro.txt',
      { type: 'text/plain' }
    );

    // Process the document
    console.log('Processing document...');
    const processResult = await NvidiaAIProcessor.processDocument(testFile);
    
    if (!processResult.success) {
      throw new Error(`Document processing failed: ${processResult.error}`);
    }

    console.log('Document processed successfully');
    console.log('Lesson ID:', processResult.data.lesson_id);

    // Evaluate the lesson
    console.log('Evaluating lesson...');
    const evaluationResult = await NvidiaAIProcessor.evaluateLesson(
      processResult.data.lesson_id
    );

    if (!evaluationResult.success) {
      throw new Error(`Lesson evaluation failed: ${evaluationResult.error}`);
    }

    console.log('Lesson evaluated successfully');
    console.log('Quality Score:', evaluationResult.data.quality_score);

    // Check if refinement is needed
    if (evaluationResult.data.quality_score < applicationRules.ai.quality.minAcceptableScore) {
      console.log('Quality score below threshold, refining lesson...');
      
      const refinementResult = await NvidiaAIProcessor.refineLesson(
        processResult.data.lesson_id
      );

      if (!refinementResult.success) {
        throw new Error(`Lesson refinement failed: ${refinementResult.error}`);
      }

      console.log('Lesson refined successfully');
    }

    const duration = Date.now() - startTime;
    aiMonitoring.recordLatency('nvidia', duration);

    return {
      success: true,
      duration,
      lessonId: processResult.data.lesson_id,
      qualityScore: evaluationResult.data.quality_score,
      feedback: evaluationResult.data.feedback
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    aiMonitoring.recordError('nvidia', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      duration: Date.now() - startTime
    };
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEducationalContent()
    .then(result => {
      console.log('\nTest Results:');
      if (result.success) {
        console.log('✅ Test completed successfully');
        console.log(`Duration: ${result.duration}ms`);
        console.log(`Lesson ID: ${result.lessonId}`);
        console.log(`Quality Score: ${result.qualityScore}`);
        console.log('Feedback:', result.feedback);
      } else {
        console.log('❌ Test failed');
        console.log(`Error: ${result.error}`);
        console.log(`Duration: ${result.duration}ms`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}