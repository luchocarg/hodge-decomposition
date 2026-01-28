module Main where

import qualified Common.GeneratorsSpec as GenSpec

import qualified DiscreteMath.DecomposeGraphSpec as DecomposeSpec
import qualified DiscreteMath.TreePathSpec as PathSpec

import qualified Infrastructure.MappersSpec as MapSpec

main :: IO ()
main = do
    putStrLn "\n----------------------------------------"
    
    MapSpec.tests

    putStrLn "\n----------------------------------------"

    GenSpec.tests

    putStrLn "\n----------------------------------------"

    DecomposeSpec.tests
    PathSpec.tests

    putStrLn "\n════════════════════════════════════════"
    putStrLn "All right"