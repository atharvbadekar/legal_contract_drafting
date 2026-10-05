/**
 * Atharv Legal AI - CLI Benchmark Runner
 * Executes the scientific accuracy and failure benchmark suite,
 * prints formatted confusion matrices and error taxonomies,
 * and saves benchmark results to JSON.
 */

import fs from 'fs';
import path from 'path';
import { benchmarkEvaluator } from './evaluator.js';

const benchmarkDir = typeof __dirname !== 'undefined' ? __dirname : path.resolve(process.cwd(), 'src/benchmark');

async function main() {
  console.log('================================================================================');
  console.log('  ATHARV LEGAL AI — EMPIRICAL BENCHMARKING & FAILURE ANALYSIS SUITE');
  console.log('================================================================================\n');
  console.log('Executing test categories across golden dataset...\n');

  const report = await benchmarkEvaluator.runCompleteBenchmark();

  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Quality Gate: [${report.qualityGate}]`);
  console.log(`Overall Accuracy: ${report.summary.overallAccuracy}% (${report.summary.passedCases}/${report.summary.totalTestCases} Passed)\n`);

  console.log('--------------------------------------------------------------------------------');
  console.log('  CONFUSION MATRICES & ACCURACY METRICS');
  console.log('--------------------------------------------------------------------------------');
  
  const printMatrix = (name: string, m: any) => {
    console.log(`\n▶ ${name}:`);
    console.log(`  TP: ${m.tp} | FP: ${m.fp} | TN: ${m.tn} | FN: ${m.fn}`);
    console.log(`  Precision: ${m.precision}% | Recall: ${m.recall}% | F1: ${m.f1}% | Accuracy: ${m.accuracy}%`);
    console.log(`  False Positive Rate: ${m.fpr}% | False Negative Rate: ${m.fnr}%`);
  };

  printMatrix('Placeholder & Template Artifact Detection', report.metrics.placeholderDetection);
  printMatrix('False Positive Resistance (Negation & Context)', report.metrics.clauseCompleteness);
  printMatrix('Contradiction & Internal Inconsistency Detection', report.metrics.contradictionDetection);
  printMatrix('Risk & Subtle Defect Detection', report.metrics.riskDetection);
  printMatrix('Overall Contract Intelligence System', report.metrics.overallContractAnalysis);

  console.log('\n--------------------------------------------------------------------------------');
  console.log('  PIPELINE GROUND-TRUTH & SAFETY METRICS');
  console.log('--------------------------------------------------------------------------------');
  console.log(`  Fact Preservation Rate:           ${report.factPreservationRate}%`);
  console.log(`  Hallucination Rate:                ${report.hallucinationRate}%`);
  console.log(`  AI Fix Success Rate:               ${report.aiFixSuccessRate}%`);
  console.log(`  Negation Classification Accuracy:  ${report.negationAccuracyRate}%`);
  console.log(`  Adversarial Injection Pass Rate:   ${report.securityPromptInjectionPassRate}%`);
  console.log(`  Avg Full Analysis Latency:         ${report.latencyMs.avgFullAnalysis}ms\n`);

  console.log('--------------------------------------------------------------------------------');
  console.log('  ERROR TAXONOMY & FAILURE MODES DETECTED');
  console.log('--------------------------------------------------------------------------------');
  if (report.errorTaxonomy.length === 0) {
    console.log('  Zero errors detected. All evaluation checks passed.');
  } else {
    report.errorTaxonomy.forEach(e => {
      console.log(`  [${e.category}] Count: ${e.count}`);
      console.log(`    Description: ${e.description}`);
      console.log(`    Examples: ${e.examples.join(', ')}`);
    });
  }

  if (report.failureDetails.length > 0) {
    console.log('\n--------------------------------------------------------------------------------');
    console.log('  ROOT CAUSE ANALYSIS FOR TOP FAILURES');
    console.log('--------------------------------------------------------------------------------');
    report.failureDetails.slice(0, 5).forEach((f, idx) => {
      console.log(`\n  ${idx + 1}. Test: ${f.testName} (${f.testId})`);
      console.log(`     Category: ${f.category}`);
      console.log(`     Expected: ${f.expected}`);
      console.log(`     Actual: ${f.actual}`);
      console.log(`     Divergence Point: ${f.divergencePoint}`);
      console.log(`     Root Cause: ${f.rootCause}`);
      console.log(`     Recommended Fix: ${f.recommendedFix}`);
    });
  }

  // Save report to JSON file
  const outPath = path.join(benchmarkDir, 'latest_benchmark.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nSaved benchmark report to: ${outPath}`);
  console.log('================================================================================\n');

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('run_benchmark.ts')) {
  main().catch(err => {
    console.error('Benchmark execution error:', err);
    process.exit(1);
  });
}

export { main as runBenchmarkCLI };
