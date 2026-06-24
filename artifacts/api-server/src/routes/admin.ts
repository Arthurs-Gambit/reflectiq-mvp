import { Router } from "express";
import db from "../db/database";

const router = Router();

const MIN_CLUSTER_SIZE = parseInt(process.env.MIN_CLUSTER_SIZE ?? "4", 10);

const SIGNAL_TO_ACTION: Record<string, string> = {
  comprehension: "No action needed",
  surface_understanding: "Reinforce",
  definitional_gap: "Clarify terminology",
  causal_reasoning_gap: "Provide real-world examples",
  applied_transfer_difficulty: "Provide real-world examples",
  pacing_concern: "Revisit",
  support_need: "Revisit",
};

interface ClusterRecipe {
  topic: string;
  signal: string;
  count: number;
  trendDirection: "up" | "down" | "stable";
  trendDelta: number | null;
  phrases: string[];
  weekOffset: number;
  isSuppressed?: boolean;
}

const CLUSTER_RECIPES: ClusterRecipe[] = [
  // Agentic AI — hotspot, heavy causal_reasoning_gap and applied_transfer_difficulty
  {
    topic: "Agentic AI",
    signal: "causal_reasoning_gap",
    count: 22,
    trendDirection: "up",
    trendDelta: 7,
    phrases: [
      "Can describe what an agent does step by step, but isn't sure why giving it autonomy is actually better than a regular script",
      "Understands the components but not what problem agentic design is solving that traditional automation doesn't",
      "Knows agents can plan and act, but can't explain why that leads to better outcomes in complex tasks",
    ],
    weekOffset: 0,
  },
  {
    topic: "Agentic AI",
    signal: "applied_transfer_difficulty",
    count: 18,
    trendDirection: "up",
    trendDelta: 5,
    phrases: [
      "Grasps the concept of an agent orchestrating tools, but struggles to describe a real product where this would outperform a simpler approach",
      "Understands agentic loops in theory, but finds it hard to pick a concrete industry problem where autonomy is actually worth the risk",
      "Can articulate what agents do, but is uncertain about what real-world failure modes to guard against",
    ],
    weekOffset: 0,
  },
  {
    topic: "Agentic AI",
    signal: "surface_understanding",
    count: 12,
    trendDirection: "stable",
    trendDelta: 0,
    phrases: [
      "Knows the definition of an agent but the explanation stays at a high level without going deeper",
      "Can repeat the key terms from the reading but the reasoning behind them feels borrowed rather than internalized",
    ],
    weekOffset: 0,
  },
  {
    topic: "Agentic AI",
    signal: "comprehension",
    count: 8,
    trendDirection: "up",
    trendDelta: 2,
    phrases: [
      "Articulates why autonomy enables better handling of ambiguous, multi-step tasks compared to deterministic scripts",
      "Connects agentic design to real use cases like research automation and customer escalation handling",
    ],
    weekOffset: 0,
  },
  // Suppressed small cluster for demo
  {
    topic: "Agentic AI",
    signal: "support_need",
    count: 2,
    trendDirection: "stable",
    trendDelta: null,
    phrases: [],
    weekOffset: 0,
    isSuppressed: true,
  },

  // Blockchain — definitional_gap early (week 1), shrinks by week 3
  {
    topic: "Blockchain",
    signal: "definitional_gap",
    count: 14,
    trendDirection: "down",
    trendDelta: -8,
    phrases: [
      "Heard the word blockchain but relies on the metaphor of a chain without understanding what data is actually being linked",
      "Associates blockchain with cryptocurrency but can't explain what makes the ledger decentralized or tamper-resistant",
      "Understands there are blocks with data but is uncertain what stops someone from just changing an old block",
    ],
    weekOffset: -14,
  },
  {
    topic: "Blockchain",
    signal: "causal_reasoning_gap",
    count: 10,
    trendDirection: "down",
    trendDelta: -3,
    phrases: [
      "Knows that consensus is required but isn't sure why that prevents fraud better than a centralized database with backups",
      "Understands hashing at a surface level but can't trace why a hash change would propagate and be detectable",
    ],
    weekOffset: -7,
  },
  {
    topic: "Blockchain",
    signal: "comprehension",
    count: 11,
    trendDirection: "up",
    trendDelta: 9,
    phrases: [
      "Accurately explains why cryptographic linking makes retroactive changes computationally impractical",
      "Connects decentralization to trust-without-intermediary and correctly identifies the trade-off with throughput",
    ],
    weekOffset: -3,
  },
  {
    topic: "Blockchain",
    signal: "surface_understanding",
    count: 7,
    trendDirection: "stable",
    trendDelta: null,
    phrases: [
      "Repeats the metaphor of an immutable ledger correctly but can't reason through a specific attack scenario",
    ],
    weekOffset: -5,
  },
  // Suppressed small cluster
  {
    topic: "Blockchain",
    signal: "pacing_concern",
    count: 3,
    trendDirection: "stable",
    trendDelta: null,
    phrases: [],
    weekOffset: -14,
    isSuppressed: true,
  },

  // Quantum Computing — smaller volume, clear support_need cluster
  {
    topic: "Quantum Computing",
    signal: "support_need",
    count: 9,
    trendDirection: "stable",
    trendDelta: 1,
    phrases: [
      "Doesn't know where to start with the math — linear algebra and complex numbers feel like prerequisites that weren't covered",
      "Wants a gentler ramp into superposition before tackling entanglement — feels like the conceptual leap is too big",
      "Finds the gap between classical intuition and quantum behavior genuinely disorienting; would benefit from more visual analogies",
    ],
    weekOffset: -5,
  },
  {
    topic: "Quantum Computing",
    signal: "definitional_gap",
    count: 8,
    trendDirection: "stable",
    trendDelta: null,
    phrases: [
      "Conflates superposition with randomness rather than understanding it as a state that collapses on measurement",
      "Uses 'qubit' and 'quantum bit' interchangeably without grasping what makes a qubit physically different from a classical bit",
    ],
    weekOffset: -7,
  },
  {
    topic: "Quantum Computing",
    signal: "causal_reasoning_gap",
    count: 6,
    trendDirection: "stable",
    trendDelta: null,
    phrases: [
      "Knows quantum computers are faster for some problems but can't explain why entanglement contributes to that speedup",
    ],
    weekOffset: -4,
  },
  {
    topic: "Quantum Computing",
    signal: "surface_understanding",
    count: 5,
    trendDirection: "stable",
    trendDelta: null,
    phrases: [
      "Can name the key principles but the explanations stay definitional without showing any causal reasoning",
    ],
    weekOffset: -10,
  },

  // Generative AI Ethics — mostly comprehension, real applied_transfer_difficulty cluster
  {
    topic: "Generative AI Ethics",
    signal: "comprehension",
    count: 20,
    trendDirection: "up",
    trendDelta: 4,
    phrases: [
      "Articulates the tension between innovation incentives and harm prevention with specific examples from current policy debates",
      "Correctly identifies how training data biases propagate into outputs and connects this to accountability frameworks",
    ],
    weekOffset: -7,
  },
  {
    topic: "Generative AI Ethics",
    signal: "applied_transfer_difficulty",
    count: 13,
    trendDirection: "stable",
    trendDelta: 1,
    phrases: [
      "Understands the ethical frameworks but struggles to articulate how a real company would operationalize a 'fairness audit' in practice",
      "Can identify the ethical issue but isn't sure what a product manager at a tech company would actually do differently as a result",
      "Grasps why bias is a problem but gets stuck when asked to propose a concrete mitigation step for a specific use case",
    ],
    weekOffset: -5,
  },
  {
    topic: "Generative AI Ethics",
    signal: "surface_understanding",
    count: 7,
    trendDirection: "stable",
    trendDelta: null,
    phrases: [
      "Can list the ethical concerns (bias, hallucination, copyright) but the responses stay categorical without reasoning about trade-offs",
    ],
    weekOffset: -10,
  },
  {
    topic: "Generative AI Ethics",
    signal: "causal_reasoning_gap",
    count: 5,
    trendDirection: "down",
    trendDelta: -2,
    phrases: [
      "Knows that bias is a problem but isn't sure how biased training data leads to biased outputs mechanically",
    ],
    weekOffset: -12,
  },

  // Cybersecurity Basics — mostly comprehension and surface_understanding, low concern
  {
    topic: "Cybersecurity Basics",
    signal: "comprehension",
    count: 18,
    trendDirection: "stable",
    trendDelta: 2,
    phrases: [
      "Correctly explains the defense-in-depth principle and maps specific controls to the threats they address",
      "Articulates the relationship between authentication, authorization, and accounting with accurate examples",
    ],
    weekOffset: -10,
  },
  {
    topic: "Cybersecurity Basics",
    signal: "surface_understanding",
    count: 14,
    trendDirection: "down",
    trendDelta: -3,
    phrases: [
      "Knows the names of attack types (phishing, SQL injection, MITM) but the explanations don't trace the attack path or show why the defense works",
      "Can define encryption but struggles to explain why HTTPS protects against a man-in-the-middle attack specifically",
    ],
    weekOffset: -7,
  },
  {
    topic: "Cybersecurity Basics",
    signal: "causal_reasoning_gap",
    count: 6,
    trendDirection: "stable",
    trendDelta: null,
    phrases: [
      "Knows that multi-factor authentication is more secure but can't explain the specific threat model it addresses",
    ],
    weekOffset: -5,
  },
  {
    topic: "Cybersecurity Basics",
    signal: "applied_transfer_difficulty",
    count: 4,
    trendDirection: "stable",
    trendDelta: null,
    phrases: [
      "Understands security principles but finds it hard to prioritize which controls matter most for a specific company size or threat profile",
    ],
    weekOffset: -3,
  },
];

const REFLECTION_TEMPLATES: Record<string, Record<string, string[][]>> = {
  "Agentic AI": {
    causal_reasoning_gap: [
      ["I learned that agentic AI systems can plan and use tools to complete tasks step by step.", "Where I'm most uncertain is why we'd use an agent instead of just writing a more detailed script.", "I think agentic AI matters because it can handle dynamic situations, but honestly I'm still not sure what's fundamentally different from advanced automation."],
      ["I understood that agents can take actions based on observations and adjust their plan.", "I'm not clear on why the autonomy part is valuable — couldn't a well-designed workflow do the same?", "The concept of autonomy seems important for complex tasks but I can't yet explain concretely what breaks if you remove it."],
      ["Agents observe, plan, and act in loops to accomplish goals without explicit step-by-step instructions.", "My uncertainty is around when you'd actually choose an agent over a fine-tuned model or a traditional rule system.", "I can see this mattering for research tasks or open-ended problems but I struggle to say exactly why the architecture enables this."],
      ["An agentic system uses tools and memory to decompose and solve complex goals.", "I'm unsure about why giving the model autonomy to choose actions is better than a human specifying those actions upfront.", "For real businesses I imagine this matters for customer service pipelines, but the specific advantage over scripted flows escapes me."],
      ["Agents can call APIs, search databases, and write code autonomously to accomplish multi-step goals.", "Where I get confused is why this scales better than a structured workflow engine like Airflow or Prefect.", "I think the key is handling ambiguity but I can't fully articulate why that requires an LLM in the loop rather than better conditionals."],
    ],
    applied_transfer_difficulty: [
      ["I learned that agentic AI uses a think-act-observe loop to complete complex goals.", "I'm uncertain about how errors compound when the agent makes a wrong intermediate decision.", "This would apply to businesses automating research or customer onboarding, but I find it hard to describe a specific workflow where the agentic design is clearly superior."],
      ["Agentic systems coordinate tools and memory to solve tasks that are too complex for a single LLM call.", "I'm unsure about what happens when two agents disagree or produce conflicting plans.", "I think this could work for a company's internal knowledge management but I struggle to say which specific tasks would benefit most."],
      ["I now understand that agents use planning, tool use, and feedback loops to achieve long-horizon goals.", "My main uncertainty is around latency and cost — every agent step is an API call which seems expensive.", "For a real use case like automating procurement, I can see the value, but I'm not sure which steps should be agent-driven versus hard-coded."],
      ["Agents are defined by their ability to take actions in an environment and update their plans based on results.", "I'm uncertain about how you'd test or debug an agent that behaved unexpectedly in production.", "In a business context this could help with compliance monitoring but the deployment complexity seems high and I can't define the threshold for when the payoff is worth it."],
    ],
    surface_understanding: [
      ["I learned that agentic AI refers to AI systems that can act autonomously to complete tasks.", "I'm uncertain about the technical details of how the planning works internally.", "Agentic AI matters because it allows automation of complex tasks, but I can't give a strong example of where it would be more effective than current methods."],
      ["Agentic AI systems are AI agents that can plan, use tools, and execute multi-step tasks.", "I'm a bit unclear on the difference between an agent and a regular chatbot with tools.", "This seems important for enterprise automation, though I'd need more time to solidify my understanding."],
      ["Agents are AI systems that perceive their environment and take actions toward goals.", "I'm uncertain about the safety implications of giving an AI system autonomous decision-making.", "I can see the relevance to business process automation, but I'd describe my understanding as still surface-level."],
    ],
    comprehension: [
      ["I learned that agentic AI decouples goal specification from task execution, allowing the system to dynamically plan and adapt without predefined steps.", "I'm most uncertain about how memory systems should be designed to prevent context drift over long agent runs.", "Agentic AI matters because it makes automation possible for tasks where the path to the goal isn't known upfront — that's transformative for knowledge work where requirements change mid-task."],
      ["Agentic design separates the reasoning layer from execution, enabling the AI to iteratively refine its approach based on real-world feedback rather than simulated scenarios.", "I'm curious about how to handle the accountability gap when an agent takes a consequential action autonomously.", "In a business context this enables processes like dynamic competitor analysis or automated deal sourcing that would be impractical with rigid automation scripts."],
    ],
  },
  "Blockchain": {
    definitional_gap: [
      ["I know blockchain is used in cryptocurrency and that it's a kind of ledger, but I'm fuzzy on the technical mechanics.", "I'm most uncertain about what 'decentralized' actually means in practice — who actually stores the data?", "I think blockchain matters for financial applications, but I can't really explain what problem it solves better than a regular database."],
      ["Blockchain seems to be a way of storing records that can't be changed, using some kind of chain structure.", "I'm not sure how the blocks are connected or why that connection matters for security.", "It seems relevant to contracts and supply chains based on what I read, but I'm honestly not clear on the mechanism."],
      ["Blockchain is a distributed ledger technology used to record transactions across many computers.", "I'm most confused about what 'consensus' means — how do many computers agree on the same record?", "I know it's used for crypto but I can't explain why you'd need blockchain for, say, a supply chain application."],
      ["I understand that blockchain stores data in blocks that are linked together, and that it's tamper-resistant somehow.", "My biggest uncertainty is around what exactly makes it tamper-resistant — is it encryption? Something else?", "I can see why financial institutions are interested but I struggle to explain the mechanism that provides the security guarantees."],
    ],
    causal_reasoning_gap: [
      ["I learned that blockchain achieves consensus through mechanisms like proof of work or proof of stake.", "I'm uncertain about why consensus prevents double-spending in a way that a traditional database can't.", "For a payment application, blockchain seems relevant, but I can't trace the exact failure mode that a centralized system has that blockchain solves."],
      ["Blockchain uses cryptographic hashing to link blocks, making tampering detectable.", "My uncertainty is around why detecting a tamper is sufficient — can't someone just re-mine the chain from the changed block?", "I understand the value for trustless transactions but the underlying reason why the math makes this secure isn't fully clear to me."],
    ],
    comprehension: [
      ["I learned that blockchain's security comes from the cost of re-computing proof-of-work for all subsequent blocks after any tampering — this makes retroactive changes computationally prohibitive.", "I'm most interested in understanding how sharding approaches address the throughput limitations without sacrificing decentralization.", "For a supply chain application, blockchain provides an auditable provenance trail that doesn't rely on any single party's honesty, which is genuinely useful when multiple competing entities need to share a record."],
      ["Blockchain creates tamper-evidence through cryptographic linking — changing one block invalidates all subsequent block hashes, making manipulation detectable by any node.", "I'm curious about the long-term scalability of full node storage as the chain grows.", "In a cross-border payment context, removing the correspondent bank intermediary via blockchain could meaningfully reduce settlement time and fees, though regulatory uncertainty is still a real barrier."],
    ],
    surface_understanding: [
      ["Blockchain is an immutable distributed ledger that records transactions across multiple nodes.", "I'm not entirely sure why decentralization matters — couldn't a very secure centralized database achieve similar goals?", "I understand it's used in supply chains and finance but I'd struggle to explain why blockchain specifically is the right tool rather than a shared database."],
    ],
  },
  "Quantum Computing": {
    support_need: [
      ["I learned the basics of qubits and superposition, but the mathematical treatment relies on linear algebra I haven't studied.", "Where I'm most uncertain is how the Bloch sphere represents qubit state — that visualization doesn't map to anything I've seen before.", "I genuinely don't know where to start with the math. I'd need a primer on complex numbers and linear algebra before this material makes sense to me."],
      ["Quantum computing uses quantum mechanical properties to process information differently than classical computers.", "I'm uncertain about almost all of it — superposition, entanglement, and interference all feel like prerequisites were assumed.", "I can see this would be important for cryptography and drug discovery based on the reading, but I need significantly more foundational material before I can reason about it."],
      ["I learned that quantum computers use qubits that can be in superposition, which is different from classical bits.", "My biggest uncertainty is around how superposition leads to computational speedup — the leap from 'two states at once' to 'exponentially faster' doesn't make sense to me yet.", "I know this matters for optimization problems, but I can't reason through why without understanding the gate operations better. I'd benefit from worked examples."],
      ["Quantum computers can theoretically solve problems that classical computers can't in practical time.", "I'm lost on the measurement step — once you measure, the superposition collapses, so how do you get a useful answer?", "I've read that this is relevant for encryption, but I'm at the point where I need more guided instruction before I can engage with the application questions."],
    ],
    definitional_gap: [
      ["I've heard that quantum computers use qubits, but I'm not confident I could explain what a qubit physically is.", "I'm most uncertain about the difference between superposition and just being in two states randomly.", "Without being clearer on the core terms I find it hard to engage with the application questions."],
      ["Quantum computing uses phenomena like superposition and entanglement to perform calculations.", "I'm unclear on what entanglement actually means — I keep reading that two particles are 'connected' but don't understand what that connection physically is.", "I think this matters for cryptography but I can't reason about it yet because the foundational terms aren't solid for me."],
    ],
    causal_reasoning_gap: [
      ["I understand that quantum computers excel at certain types of problems, especially those involving optimization and simulation.", "I'm uncertain about how having many qubits actually translates to computational advantage — what does it mean for them to work together?", "For pharmaceutical research this seems highly relevant, but the mechanism of how entanglement enables speedup still escapes me."],
    ],
    surface_understanding: [
      ["Quantum computers use superposition and entanglement to process information in ways that classical computers can't.", "I'm not sure how to assess which problems genuinely benefit from quantum versus which are just theoretical examples.", "I understand the high-level promise but would need to work through a concrete algorithm to really get it."],
    ],
  },
  "Generative AI Ethics": {
    comprehension: [
      ["I learned that the core ethical challenges in generative AI stem from training data biases that propagate into model outputs in ways that aren't always visible to end users.", "I'm most uncertain about how to assign accountability when a model causes harm — between the data provider, model developer, and deployer.", "This matters for businesses deploying AI in hiring or lending because discriminatory outputs create both legal exposure and real harm, and understanding the causal chain helps design better safeguards."],
      ["Generative AI raises ethical concerns around consent, attribution, and the displacement of human creators whose work was used in training without compensation.", "I'm uncertain about how the current copyright framework applies to model outputs — is the output derived from training data or genuinely novel?", "For a media company using AI to generate content, these questions have immediate legal and reputational implications and the ethical framework we discussed helps structure the risk assessment."],
      ["The key ethical issues include hallucinations presented as facts, amplification of biases, and the potential for misuse in disinformation campaigns.", "I'm curious about how transparency requirements could be designed without disclosing proprietary training details.", "For a news organization considering AI-assisted reporting, the accountability and verification challenges are practical day-one concerns, not theoretical ones."],
      ["I learned that informed consent is a meaningful ethical principle in AI — users should know when they're interacting with AI and how their data is being used.", "My uncertainty is around how to handle edge cases where full disclosure might reduce the system's effectiveness, like in therapeutic chatbots.", "For a healthcare tech company, these trade-offs require interdisciplinary input from ethicists, clinicians, and legal counsel — this topic helped me understand why."],
    ],
    applied_transfer_difficulty: [
      ["I understand the ethical frameworks — consequentialism, deontology, virtue ethics — and how they apply to AI development.", "My biggest uncertainty is around how a company would actually operationalize an AI ethics policy in day-to-day product decisions.", "I can identify when a use of generative AI seems ethically problematic, but I'd struggle to tell you what the product manager should change in their next sprint to address it."],
      ["I learned about the risks of generative AI including bias amplification, hallucination, and misuse for disinformation.", "I'm uncertain about how to balance moving fast with the caution the ethical considerations seem to demand.", "In a real company context, I understand that there should be a fairness audit, but I don't know who runs it, what data they look at, or how you decide when a model passes."],
      ["The ethical principles we covered — fairness, transparency, accountability, privacy — make intuitive sense.", "My uncertainty is around how to handle situations where two principles conflict, like when transparency would compromise user privacy.", "I can articulate the ethical issue in a case study but converting that into a concrete product decision at a tech company is harder than it sounds."],
      ["I understand why bias in training data is ethically significant and can identify examples of it in consumer products.", "I'm uncertain about what the threshold should be for a model to be 'biased enough' to not deploy — is there a quantitative standard?", "For a company building a hiring tool, I know they need to audit for disparate impact, but I'm not sure what a responsible audit process actually looks like step by step."],
    ],
    surface_understanding: [
      ["Generative AI raises ethical concerns including copyright, bias, misinformation, and privacy.", "I'm uncertain about which of these concerns is most serious — they all seem significant.", "I understand these are important issues for companies using AI, but I'd describe my ability to reason about specific trade-offs as still developing."],
    ],
    causal_reasoning_gap: [
      ["I know that biased training data leads to biased model outputs, which is a well-documented ethical problem.", "I'm not sure exactly how a bias in the training distribution ends up expressed in the model's behavior — is it during training, fine-tuning, or prompting?", "For a company building a content moderation tool, I know bias is a risk but I can't trace the mechanism well enough to tell them where to intervene."],
    ],
  },
  "Cybersecurity Basics": {
    comprehension: [
      ["I learned about the CIA triad — confidentiality, integrity, availability — as the foundational framework for evaluating security controls and threats.", "I'm most interested in deepening my understanding of zero-trust architecture and how it changes the implementation of perimeter security assumptions.", "This matters for any company handling customer data — understanding the threat model lets you prioritize where to invest in security controls rather than treating all risks as equal."],
      ["Defense in depth means layering multiple security controls so that the failure of any single control doesn't lead to full compromise.", "I'm curious about how you evaluate whether a control actually reduces risk or just adds compliance overhead.", "For a startup deciding what to prioritize with limited resources, the risk-based framing we discussed gives a practical way to choose between implementing MFA, encrypting data at rest, or improving logging."],
      ["I learned that authentication verifies identity, authorization determines access rights, and these are distinct problems that require separate design consideration.", "My uncertainty is around how to design authorization policies that don't become unmanageable as an organization grows.", "For any company moving to the cloud, getting IAM policies right from the beginning is significantly cheaper than retrofitting them after a breach."],
      ["Security controls can be preventive, detective, or corrective, and a mature security posture requires all three types working together.", "I'm most uncertain about how incident response plans translate into actual readiness — planning and execution are very different things.", "For a healthcare company subject to HIPAA, understanding the regulatory mapping helps justify security investments internally, which is a real organizational challenge."],
    ],
    surface_understanding: [
      ["I learned about common attack types — phishing, SQL injection, man-in-the-middle, ransomware — and the basic defenses against each.", "I'm uncertain about how attackers choose their targets and whether the defenses I read about are sufficient for a real attacker with resources.", "This seems directly relevant to any business with an online presence, but I'd describe my understanding as more definitional than strategic."],
      ["Cybersecurity involves protecting systems, networks, and data from digital attacks through a combination of technical controls and organizational practices.", "I'm not sure how to assess which threats are most likely for a specific company versus which are just theoretical.", "I can define encryption and firewalls but I'd struggle to explain exactly why HTTPS prevents a specific type of attack or when it wouldn't be sufficient."],
    ],
    causal_reasoning_gap: [
      ["I know that multi-factor authentication significantly reduces the risk of account takeover.", "I'm uncertain about what specific threat model MFA addresses and when it wouldn't be sufficient — like if an attacker has already compromised the device.", "I can recommend MFA but I can't fully explain the attack path it interrupts, which would make it hard to advise on alternatives if MFA isn't feasible."],
    ],
    applied_transfer_difficulty: [
      ["I understand the core security principles and can identify what controls address what threats.", "My uncertainty is around how a small company with a two-person IT team should prioritize — all the controls seem important and I don't have a framework for triaging.", "I can describe best practices but converting that into a prioritized implementation roadmap for a specific company with specific constraints is harder than the theory suggests."],
    ],
  },
};

function getReflectionsForCluster(recipe: ClusterRecipe): string[][] {
  const templates = REFLECTION_TEMPLATES[recipe.topic]?.[recipe.signal] ?? [];
  if (templates.length === 0) {
    const generics: string[][] = [];
    for (let i = 0; i < recipe.count; i++) {
      generics.push([
        `I learned key concepts about ${recipe.topic} in this session.`,
        `I'm uncertain about some of the more advanced aspects of ${recipe.topic}.`,
        `This topic matters because it has real applications in technology and business contexts.`,
      ]);
    }
    return generics;
  }

  const result: string[][] = [];
  for (let i = 0; i < recipe.count; i++) {
    const base = templates[i % templates.length];
    const perturbations = [
      base,
      [base[0] + " I found the examples helpful.", base[1], base[2]],
      [base[0], base[1] + " I'd like to revisit this.", base[2]],
      [base[0], base[1], base[2] + " Overall this was a thought-provoking topic."],
      ["After reviewing the material, " + base[0].charAt(0).toLowerCase() + base[0].slice(1), base[1], base[2]],
    ];
    result.push(perturbations[i % perturbations.length]);
  }
  return result;
}

router.post("/seed", (_req, res) => {
  try {
    db.exec(`DELETE FROM reflections; DELETE FROM clusters;`);

    let totalReflections = 0;
    let visibleClusters = 0;
    let suppressedClusters = 0;

    for (const recipe of CLUSTER_RECIPES) {
      const isSuppressed = recipe.isSuppressed || recipe.count < MIN_CLUSTER_SIZE;
      const phrases = recipe.phrases ?? [];

      const clusterInfo = db.prepare(
        `INSERT INTO clusters (topic, signal, student_count, representative_phrases, suggested_action, trend_direction, trend_delta, is_suppressed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`
      ).run(
        recipe.topic,
        recipe.signal,
        recipe.count,
        JSON.stringify(phrases),
        SIGNAL_TO_ACTION[recipe.signal] ?? "Revisit",
        recipe.trendDirection,
        recipe.trendDelta,
        isSuppressed ? 1 : 0,
        `-${Math.abs(recipe.weekOffset)} days`
      );

      const clusterId = clusterInfo.lastInsertRowid as number;

      if (isSuppressed) {
        suppressedClusters++;
      } else {
        visibleClusters++;
      }

      const reflectionTexts = getReflectionsForCluster(recipe);

      for (let i = 0; i < recipe.count; i++) {
        const texts = reflectionTexts[i % reflectionTexts.length];
        const daysAgo = Math.abs(recipe.weekOffset) + Math.floor(Math.random() * 7);
        db.prepare(
          `INSERT INTO reflections (topic, step1_text, step2_text, step3_text, signal, confidence, cluster_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`
        ).run(
          recipe.topic,
          texts[0] ?? "",
          texts[1] ?? "",
          texts[2] ?? "",
          recipe.signal,
          0.7 + Math.random() * 0.25,
          isSuppressed ? null : clusterId,
          `-${daysAgo} days`
        );
        totalReflections++;
      }
    }

    res.json({ reflectionsCreated: totalReflections, clustersCreated: visibleClusters, suppressedClusters });
  } catch (err) {
    res.status(500).json({ error: "Seed failed" });
  }
});

router.get("/stats", (_req, res) => {
  const totalRawReflections = (
    db.prepare(`SELECT COUNT(*) as cnt FROM reflections`).get() as { cnt: number }
  ).cnt;

  const visibleClusters = (
    db.prepare(`SELECT COUNT(*) as cnt FROM clusters WHERE is_suppressed = 0`).get() as { cnt: number }
  ).cnt;

  const suppressedClusters = (
    db.prepare(`SELECT COUNT(*) as cnt FROM clusters WHERE is_suppressed = 1`).get() as { cnt: number }
  ).cnt;

  res.json({
    totalRawReflections,
    visibleClusters,
    suppressedClusters,
    minClusterSize: MIN_CLUSTER_SIZE,
  });
});

export default router;
