# Stochastic Input Validity

## Process Definition

Let $\Psi$ be the generative function parametrized by the configuration vector $\theta = (N_{range}, \rho, \Phi)$, where:
* $N_{range} \in \mathbb{N}^2$: Node count bounds.
* $\rho \in [0, 1]$: Edge density factor.
* $\Phi \subseteq \mathbb{R}$: Domain of valid flow values.

The process produces a **Weighted Directed Graph** $G \sim \Psi(\theta)$ defined as a tuple $G = (V, E, f)$.

### Components
1.  **Topology ($V, E$):**
    The edge set is constructed as the disjoint union of a spanning structure ($E_{skeleton}$) and stochastic noise ($E_{noise}$), enforced as a **Simple Graph**:
    $$E = E_{skeleton} \cup E_{noise} \quad \text{s.t.} \quad E \subseteq (V \times V) \setminus \{(v,v) | v \in V\}$$

2.  **Flow Field ($f$):**
    A mapping that assigns a scalar value (flux/current) to every edge from the domain $\Phi$:
    $$f: E \to \Phi$$

---

## Validity Axioms

Every realization $G$ produced by the generator must satisfy the following strict axioms. These are formally verified before any physics simulation begins.

### Axiom I: Non-Triviality
The manifold must have sufficient dimension to define a potential difference.
$$|V| \ge 2$$

### Axiom II: Referential Integrity
All edges must connect vertices that strictly exist within the domain $V$.
$$\forall (u, v) \in E \implies u \in V \land v \in V$$

### Axiom III: Weak Connectivity
While flow is directed, the underlying topological manifold must be a single connected component.
$$\kappa(G_{undirected}) = 1$$

### Axiom IV: Topological Simplicity
The graph must be **Simple** to ensure well-defined divergence.
$$\forall (u, v) \in E \implies u \neq v$$

### Axiom V: Identity Uniqueness
Every edge entity must possess a globally unique identifier for linear algebra operations.
$$id(e_i) = id(e_j) \iff i = j$$

---

## 3. Implementation Mapping

| Concept | QuickCheck |
| :--- | :--- |
| **Axiom I** | `prop_nonTrivial` |
| **Axiom II** | `prop_edgesAreValid` |
| **Axiom III** | `prop_isConnected` |
| **Axiom IV** | `prop_noSelfLoops` |
| **Axiom V** | `prop_uniqueEdgeIds` |