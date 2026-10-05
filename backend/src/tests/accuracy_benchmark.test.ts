import { describe, it } from 'node:test';
import assert from 'node:assert';
import { benchmarkEvaluator } from '../benchmark/evaluator.js';

describe('Atharv Legal AI — Scientific Accuracy Benchmark Suite', () => {
  it('Evaluates Golden Dataset with Quality Gate GREEN and zero critical failure modes', async () => {
    const report = await benchmarkEvaluator.runCompleteBenchmark();

    console.log(`\nAutomated Test Benchmark Score: ${report.overallScore}% (${report.summary.passedCases}/${report.summary.totalTestCases} passed)`);
    console.log(`Quality Gate: [${report.qualityGate}]`);

    // 1. Quality Gate Assertion
    assert.strictEqual(report.qualityGate, 'GREEN', `Quality gate must be GREEN, got ${report.qualityGate}`);

    // 2. Accuracy Assertion
    assert.ok(report.overallScore >= 95, `Overall accuracy must be >= 95%, got ${report.overallScore}%`);

    // 3. Placeholder Precision & Recall Assertions
    assert.ok(report.metrics.placeholderDetection.precision >= 95, `Placeholder precision must be >= 95%, got ${report.metrics.placeholderDetection.precision}%`);
    assert.ok(report.metrics.placeholderDetection.recall >= 95, `Placeholder recall must be >= 95%, got ${report.metrics.placeholderDetection.recall}%`);
    assert.strictEqual(report.metrics.placeholderDetection.fpr, 0, `Placeholder False Positive Rate must be 0%, got ${report.metrics.placeholderDetection.fpr}%`);

    // 4. Contradiction Detection Assertions
    assert.ok(report.metrics.contradictionDetection.precision >= 95, `Contradiction precision must be >= 95%, got ${report.metrics.contradictionDetection.precision}%`);
    assert.ok(report.metrics.contradictionDetection.recall >= 95, `Contradiction recall must be >= 95%, got ${report.metrics.contradictionDetection.recall}%`);

    // 5. Risk & Defect Detection Assertions
    assert.ok(report.metrics.riskDetection.recall >= 95, `Risk detection recall must be >= 95%, got ${report.metrics.riskDetection.recall}%`);

    // 6. Ground-Truth Safety Metrics Assertions
    assert.strictEqual(report.factPreservationRate, 100, `Fact preservation rate must be 100%, got ${report.factPreservationRate}%`);
    assert.strictEqual(report.hallucinationRate, 0, `Hallucination rate must be 0%, got ${report.hallucinationRate}%`);
    assert.strictEqual(report.aiFixSuccessRate, 100, `AI fix success rate must be 100%, got ${report.aiFixSuccessRate}%`);
    assert.strictEqual(report.negationAccuracyRate, 100, `Negation accuracy rate must be 100%, got ${report.negationAccuracyRate}%`);
    assert.strictEqual(report.securityPromptInjectionPassRate, 100, `Adversarial pass rate must be 100%, got ${report.securityPromptInjectionPassRate}%`);
  });
});
