module ContinuousMath.StokesSpec (tests) where

import Test.QuickCheck
import qualified Data.Map.Strict as Map
import Domain.Types
import Common.Generators (genConnectedGraph)
import DiscreteMath.DecomposeGraph (decomposeGraph)
import ContinuousMath.Stokes (calculateRotationalFlow)
import ContinuousMath.Gauss (calculateDivergences)


prop_isSolenoidal :: ComputationalGraph -> Property
prop_isSolenoidal g@(ComputationalGraph adjMap) =
    let
        -- Extract rotational components
        (tree, cotree) = decomposeGraph g
        rotMap = calculateRotationalFlow tree cotree
        
        -- inject rotational flow into a graph structure
        mkRotEdge e = e { currentFlow = Map.findWithDefault 0.0 (edgeIdentifier e) rotMap }
        rotEdges = map mkRotEdge (concat $ Map.elems adjMap)
        
        --Rebuild, we must preserve all nodes even if they have no outgoing flow
        allNodes = Map.keys adjMap
        rotAdj = Map.fromListWith (++) $
                 [ (n, []) | n <- allNodes ] ++
                 [ (sourceNode e, [e]) | e <- rotEdges ]
        
        rotGraph = ComputationalGraph rotAdj
        
        divs = calculateDivergences rotGraph
        epsilon = 1e-9
    in
        counterexample ("Rotational field is not solenoidal. Divs: " ++ show divs) $
        all (\d -> abs d < epsilon) (Map.elems divs)

tests :: IO ()
tests = do
    putStrLn "\n[ContinuousMath.Stokes] Verifying Laws..."
    
    putStrLn "Solenoidal Property"
    quickCheck $ forAll genConnectedGraph prop_isSolenoidal