import json
import random

WIDTH = 10
HEIGHT = 10

nodes = []
edges = []
edge_counter = 1

for y in range(HEIGHT):
    for x in range(WIDTH):
        node_id = (y * WIDTH) + x + 1
        nodes.append(node_id)

for y in range(HEIGHT):
    for x in range(WIDTH):
        current_node = (y * WIDTH) + x + 1
        
        if x < WIDTH - 1:
            next_node = current_node + 1
            flow = 10.0 + random.uniform(-5.0, 5.0) 
            edges.append({
                "id": edge_counter,
                "from": current_node,
                "to": next_node,
                "flow": flow
            })
            edge_counter += 1
            
        if y < HEIGHT - 1:
            down_node = ((y + 1) * WIDTH) + x + 1
            flow = 5.0 + random.uniform(-5.0, 5.0)
            edges.append({
                "id": edge_counter,
                "from": current_node,
                "to": down_node,
                "flow": flow
            })
            edge_counter += 1

output_dto = {
    "nodes": nodes,
    "edges": edges
}

print(json.dumps(output_dto))