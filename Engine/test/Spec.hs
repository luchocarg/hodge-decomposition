import qualified Common.GeneratorSpec as GenSpec

main :: IO ()
main = do
    putStrLn "   CHECKING..."
    
    GenSpec.tests
    
    putStrLn "\n ALL RIGHT"