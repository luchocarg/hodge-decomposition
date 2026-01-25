## 1. Sampling Space Definition

Let $\mathcal{G}_{gen}$ be a stochastic process that produces a directed graph $G = (V, E)$.


1.  **Closure:**
    $$\forall (u, v) \in E \implies u \in V \land v \in V$$

2.  **Uniqueness:**
    $$\forall i, j \in V, i \neq j \implies id(i) \neq id(j)$$

3.  **Connectivity:**
    $$|V| > 1 \land \forall u,v \in V, \exists \text{ path}(u, v)$$

---

## 2. Topological Invariants

Given the decomposition of $E$ into Tree Edges ($E_T$) and Cycle Edges ($E_C$):

1. **Conservative Partition**
$$|E| = |E_T| + |E_C| \quad \land \quad E_T \cap E_C = \emptyset$$

2. **Structural Acyclicity**
$$\nexists \text{ cycle } C \subseteq E_T$$

3. **Maximal Coverage**
$$V(E_T) = V(G)$$