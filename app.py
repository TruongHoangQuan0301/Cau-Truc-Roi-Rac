

from flask import Flask, render_template, request, jsonify
import networkx as nx
import json
import os
from datetime import datetime

app = Flask(__name__)

GRAPHS_FOLDER = 'saved_graphs'
if not os.path.exists(GRAPHS_FOLDER):
    os.makedirs(GRAPHS_FOLDER)

graph_data = {
    'graph': nx.Graph(),
    'positions': {},
    'selected_node': None,
    'is_directed': False
}

@app.route('/')
def index():
    
    return render_template('index.html')

@app.route('/api/add_node', methods=['POST'])
def add_node():
    
    data = request.json
    node_id = data.get('node_id')
    x = data.get('x', 400)
    y = data.get('y', 300)
    

    if node_id and node_id not in graph_data['graph']:
        graph_data['graph'].add_node(node_id)
        graph_data['positions'][node_id] = {'x': x, 'y': y}
        return jsonify({'success': True, 'message': 'Node đã được thêm'})
    
    return jsonify({'success': False, 'message': 'Node đã tồn tại hoặc không hợp lệ'})

@app.route('/api/add_edge', methods=['POST'])
def add_edge():
    
    data = request.json
    node1 = data.get('node1')
    node2 = data.get('node2')
    weight = data.get('weight', 1)
    

    if not (node1 in graph_data['graph'] and node2 in graph_data['graph']):
        return jsonify({'success': False, 'message': 'Một hoặc cả hai node không tồn tại'})
    

    if not graph_data['is_directed']:
        graph_data['graph'].add_edge(node1, node2, weight=weight)
        return jsonify({'success': True, 'message': f'Cạnh {node1}-{node2} đã được thêm'})
    

    direction = data.get('direction', 'both')
    
    if direction == 'one_way_1_to_2':

        graph_data['graph'].add_edge(node1, node2, weight=weight)
        return jsonify({'success': True, 'message': f'Cạnh {node1} → {node2} đã được thêm'})
    elif direction == 'one_way_2_to_1':

        graph_data['graph'].add_edge(node2, node1, weight=weight)
        return jsonify({'success': True, 'message': f'Cạnh {node2} → {node1} đã được thêm'})
    else:

        graph_data['graph'].add_edge(node1, node2, weight=weight)
        graph_data['graph'].add_edge(node2, node1, weight=weight)
        return jsonify({'success': True, 'message': f'Cạnh 2 chiều {node1} ↔ {node2} đã được thêm'})

@app.route('/api/remove_node', methods=['POST'])
def remove_node():
    
    data = request.json
    node_id = data.get('node_id')
    
    if node_id in graph_data['graph']:
        graph_data['graph'].remove_node(node_id)

        if node_id in graph_data['positions']:
            del graph_data['positions'][node_id]
        return jsonify({'success': True, 'message': f'Đã xóa đỉnh {node_id}'})
    
    return jsonify({'success': False, 'message': 'Đỉnh không tồn tại'})

@app.route('/api/remove_edge', methods=['POST'])
def remove_edge():
    
    data = request.json
    node1 = data.get('node1')
    node2 = data.get('node2')
    
    if node1 in graph_data['graph'] and node2 in graph_data['graph']:
        if graph_data['graph'].has_edge(node1, node2):
            graph_data['graph'].remove_edge(node1, node2)
            return jsonify({'success': True, 'message': f'Đã xóa cạnh {node1}-{node2}'})
        else:
            return jsonify({'success': False, 'message': 'Cạnh không tồn tại'})
    
    return jsonify({'success': False, 'message': 'Một hoặc cả hai đỉnh không tồn tại'})

@app.route('/api/get_graph', methods=['GET'])
def get_graph():
    
    nodes = []

    for node_id in graph_data['graph'].nodes():
        pos = graph_data['positions'].get(node_id, {'x': 400, 'y': 300})
        nodes.append({
            'id': node_id,
            'x': pos['x'],
            'y': pos['y']
        })
    
    edges = []

    for edge in graph_data['graph'].edges():
        weight = graph_data['graph'].get_edge_data(edge[0], edge[1]).get('weight', 1)
        edges.append({
            'source': edge[0],
            'target': edge[1],
            'weight': weight
        })
    

    num_nodes = graph_data['graph'].number_of_nodes()
    num_edges = graph_data['graph'].number_of_edges()
    

    is_connected = False
    if num_nodes > 0:
        if graph_data['is_directed']:
            is_connected = nx.is_weakly_connected(graph_data['graph'])
        else:
            is_connected = nx.is_connected(graph_data['graph'])
    
    stats = {
        'num_nodes': num_nodes,
        'num_edges': num_edges,
        'density': nx.density(graph_data['graph']) if num_nodes > 0 else 0,
        'is_connected': is_connected
    }
    
    return jsonify({
        'nodes': nodes,
        'edges': edges,
        'stats': stats,
        'is_directed': graph_data['is_directed']
    })

@app.route('/api/spring_layout', methods=['POST'])
def spring_layout():
    
    if graph_data['graph'].number_of_nodes() > 0:

        positions = nx.spring_layout(graph_data['graph'], k=1, iterations=50, seed=42)
        

        for node_id, (x, y) in positions.items():
            graph_data['positions'][node_id] = {
                'x': (x + 1) * 400,
                'y': (y + 1) * 300
            }
        return jsonify({'success': True, 'message': 'Spring layout đã được áp dụng'})
    
    return jsonify({'success': False, 'message': 'Không có node nào'})

@app.route('/api/circular_layout', methods=['POST'])
def circular_layout():
    
    if graph_data['graph'].number_of_nodes() > 0:

        positions = nx.circular_layout(graph_data['graph'])
        

        for node_id, (x, y) in positions.items():
            graph_data['positions'][node_id] = {
                'x': (x + 1) * 400,
                'y': (y + 1) * 300
            }
        return jsonify({'success': True, 'message': 'Circular layout đã được áp dụng'})
    
    return jsonify({'success': False, 'message': 'Không có node nào'})

@app.route('/api/clear_all', methods=['POST'])
def clear_all():
    
    graph_data['graph'].clear()
    graph_data['positions'].clear()
    graph_data['selected_node'] = None
    return jsonify({'success': True, 'message': 'Đã xóa tất cả'})

@app.route('/api/update_position', methods=['POST'])
def update_position():
    
    data = request.json
    node_id = data.get('node_id')
    x = data.get('x')
    y = data.get('y')
    
    if node_id in graph_data['positions']:
        graph_data['positions'][node_id] = {'x': x, 'y': y}
        return jsonify({'success': True})
    
    return jsonify({'success': False})

@app.route('/api/toggle_directed', methods=['POST'])
def toggle_directed():
    
    data = request.json
    is_directed = data.get('is_directed', False)
    

    old_positions = graph_data['positions'].copy()
    

    if is_directed:
        new_graph = nx.DiGraph()
    else:
        new_graph = nx.Graph()
    

    new_graph.add_nodes_from(graph_data['graph'].nodes())
    

    for edge in graph_data['graph'].edges(data=True):
        new_graph.add_edge(edge[0], edge[1], **edge[2])
    

    graph_data['graph'] = new_graph
    graph_data['positions'] = old_positions
    graph_data['is_directed'] = is_directed
    
    return jsonify({
        'success': True, 
        'message': f'Đã chuyển sang đồ thị {"có hướng" if is_directed else "vô hướng"}'
    })

@app.route('/api/export_graph', methods=['GET'])
def export_graph():
    
    try:

        save_data = {
            'nodes': [],
            'edges': [],
            'is_directed': graph_data['is_directed']
        }
        

        for node_id in graph_data['graph'].nodes():
            pos = graph_data['positions'].get(node_id, {'x': 400, 'y': 300})
            save_data['nodes'].append({
                'id': node_id,
                'x': pos['x'],
                'y': pos['y']
            })
        

        for edge in graph_data['graph'].edges():
            weight = graph_data['graph'].get_edge_data(edge[0], edge[1]).get('weight', 1)
            save_data['edges'].append({
                'source': edge[0],
                'target': edge[1],
                'weight': weight
            })
        
        return jsonify({
            'success': True,
            'data': save_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi xuất: {str(e)}'
        })

@app.route('/api/import_graph', methods=['POST'])
def import_graph():
    
    try:
        graph_file_data = request.json
        
        if not graph_file_data:
            return jsonify({
                'success': False,
                'message': 'Dữ liệu không hợp lệ'
            })
        

        graph_data['graph'].clear()
        graph_data['positions'].clear()
        

        is_directed = graph_file_data.get('is_directed', False)
        if is_directed:
            graph_data['graph'] = nx.DiGraph()
        else:
            graph_data['graph'] = nx.Graph()
        
        graph_data['is_directed'] = is_directed
        

        for node in graph_file_data.get('nodes', []):
            node_id = node['id']
            graph_data['graph'].add_node(node_id)
            graph_data['positions'][node_id] = {
                'x': node.get('x', 400),
                'y': node.get('y', 300)
            }
        

        for edge in graph_file_data.get('edges', []):
            graph_data['graph'].add_edge(
                edge['source'],
                edge['target'],
                weight=edge.get('weight', 1)
            )
        
        return jsonify({
            'success': True,
            'message': 'Đã tải đồ thị thành công'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi tải: {str(e)}'
        })

@app.route('/api/shortest_path', methods=['POST'])
def shortest_path():
    
    try:
        data = request.json
        source = data.get('source')
        target = data.get('target')
        
        if not source or not target:
            return jsonify({
                'success': False,
                'message': 'Vui lòng chọn node bắt đầu và node kết thúc'
            })
        
        if source not in graph_data['graph'] or target not in graph_data['graph']:
            return jsonify({
                'success': False,
                'message': 'Node không tồn tại trong đồ thị'
            })
        
        if source == target:
            return jsonify({
                'success': True,
                'path': [source],
                'distance': 0,
                'message': f'Node bắt đầu và kết thúc trùng nhau'
            })
        
        try:

            path = nx.shortest_path(graph_data['graph'], source=source, target=target, weight='weight')
            distance = nx.shortest_path_length(graph_data['graph'], source=source, target=target, weight='weight')
            
            return jsonify({
                'success': True,
                'path': path,
                'distance': round(distance, 2),
                'message': f'Đường đi ngắn nhất từ {source} đến {target}: {" → ".join(path)} (độ dài: {round(distance, 2)})'
            })
        except nx.NetworkXNoPath:
            return jsonify({
                'success': False,
                'message': f'Không tìm thấy đường đi từ {source} đến {target}'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        })

@app.route('/api/bfs', methods=['POST'])
def bfs_traversal():
    
    try:
        data = request.json
        start_node = data.get('start_node')
        
        if not start_node:
            return jsonify({
                'success': False,
                'message': 'Vui lòng chọn đỉnh bắt đầu'
            })
        
        if start_node not in graph_data['graph']:
            return jsonify({
                'success': False,
                'message': 'Đỉnh không tồn tại trong đồ thị'
            })
        

        from collections import deque
        
        visited = set()
        queue = deque([start_node])
        bfs_order = []
        visited.add(start_node)
        
        while queue:
            current = queue.popleft()
            bfs_order.append(current)
            

            neighbors = sorted(list(graph_data['graph'].neighbors(current)), 
                             key=lambda n: (graph_data['positions'].get(n, {}).get('y', 0), 
                                          graph_data['positions'].get(n, {}).get('x', 0)))
            
            for neighbor in neighbors:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        

        return jsonify({
            'success': True,
            'order': bfs_order,
            'message': f'BFS từ {start_node}: {" → ".join(bfs_order)}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        })

@app.route('/api/dfs', methods=['POST'])
def dfs_traversal():
    
    try:
        data = request.json
        start_node = data.get('start_node')
        
        if not start_node:
            return jsonify({
                'success': False,
                'message': 'Vui lòng chọn đỉnh bắt đầu'
            })
        
        if start_node not in graph_data['graph']:
            return jsonify({
                'success': False,
                'message': 'Đỉnh không tồn tại trong đồ thị'
            })
        

        visited = set()
        dfs_order = []
        
        def dfs_recursive(node):
            
            visited.add(node)
            dfs_order.append(node)
            

            neighbors = sorted(list(graph_data['graph'].neighbors(node)),
                             key=lambda n: (graph_data['positions'].get(n, {}).get('y', 0),
                                          graph_data['positions'].get(n, {}).get('x', 0)))
            
            for neighbor in neighbors:
                if neighbor not in visited:
                    dfs_recursive(neighbor)
        
        dfs_recursive(start_node)
        

        return jsonify({
            'success': True,
            'order': dfs_order,
            'message': f'DFS từ {start_node}: {" → ".join(dfs_order)}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        })

@app.route('/api/check_bipartite', methods=['GET'])
def check_bipartite():
    
    try:
        if graph_data['graph'].number_of_nodes() == 0:
            return jsonify({
                'success': False,
                'message': 'Đồ thị rỗng'
            })
        

        is_bipartite = nx.is_bipartite(graph_data['graph'])
        
        if is_bipartite:

            color_dict = nx.bipartite.color(graph_data['graph'])
            set1 = [node for node, color in color_dict.items() if color == 0]
            set2 = [node for node, color in color_dict.items() if color == 1]
            
            return jsonify({
                'success': True,
                'is_bipartite': True,
                'set1': set1,
                'set2': set2,
                'color_dict': color_dict,
                'message': f'Đây là đồ thị 2 phía!\nTập 1: {{{", ".join(set1)}}}\nTập 2: {{{", ".join(set2)}}}'
            })
        else:
            return jsonify({
                'success': True,
                'is_bipartite': False,
                'message': 'Đây KHÔNG phải là đồ thị 2 phía'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        })

@app.route('/api/get_representations', methods=['GET'])
def get_representations():
    
    try:
        if graph_data['graph'].number_of_nodes() == 0:
            return jsonify({
                'success': False,
                'message': 'Đồ thị rỗng'
            })
        

        nodes = sorted(list(graph_data['graph'].nodes()))
        n = len(nodes)
        

        adj_matrix = []
        node_to_idx = {node: i for i, node in enumerate(nodes)}
        
        for i in range(n):
            row = [0] * n
            for j in range(n):
                if graph_data['graph'].has_edge(nodes[i], nodes[j]):
                    weight = graph_data['graph'].get_edge_data(nodes[i], nodes[j]).get('weight', 1)
                    row[j] = weight
            adj_matrix.append(row)
        

        adj_list = {}
        for node in nodes:
            neighbors = []
            for neighbor in graph_data['graph'].neighbors(node):
                weight = graph_data['graph'].get_edge_data(node, neighbor).get('weight', 1)
                neighbors.append({'node': neighbor, 'weight': weight})
            adj_list[node] = neighbors
        

        edge_list = []
        for edge in graph_data['graph'].edges():
            weight = graph_data['graph'].get_edge_data(edge[0], edge[1]).get('weight', 1)
            edge_list.append({
                'source': edge[0],
                'target': edge[1],
                'weight': weight
            })
        
        return jsonify({
            'success': True,
            'nodes': nodes,
            'adjacency_matrix': adj_matrix,
            'adjacency_list': adj_list,
            'edge_list': edge_list,
            'is_directed': graph_data['is_directed']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        })

@app.route('/api/prim_mst', methods=['GET'])
def prim_mst():
    
    try:
        if graph_data['graph'].number_of_nodes() == 0:
            return jsonify({
                'success': False,
                'message': 'Đồ thị rỗng'
            })
        
        if graph_data['is_directed']:
            return jsonify({
                'success': False,
                'message': 'Thuật toán Prim chỉ áp dụng cho đồ thị vô hướng'
            })
        
        if not nx.is_connected(graph_data['graph']):
            return jsonify({
                'success': False,
                'message': 'Đồ thị không liên thông'
            })
        

        mst = nx.minimum_spanning_tree(graph_data['graph'], algorithm='prim', weight='weight')
        
        mst_edges = []
        total_weight = 0
        for edge in mst.edges():
            weight = graph_data['graph'].get_edge_data(edge[0], edge[1]).get('weight', 1)
            mst_edges.append({
                'source': edge[0],
                'target': edge[1],
                'weight': weight
            })
            total_weight += weight
        
        return jsonify({
            'success': True,
            'edges': mst_edges,
            'total_weight': round(total_weight, 2),
            'message': f'Cây khung nhỏ nhất (Prim)\nTổng trọng số: {round(total_weight, 2)}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        })

@app.route('/api/kruskal_mst', methods=['GET'])
def kruskal_mst():
    
    try:
        if graph_data['graph'].number_of_nodes() == 0:
            return jsonify({
                'success': False,
                'message': 'Đồ thị rỗng'
            })
        
        if graph_data['is_directed']:
            return jsonify({
                'success': False,
                'message': 'Thuật toán Kruskal chỉ áp dụng cho đồ thị vô hướng'
            })
        
        if not nx.is_connected(graph_data['graph']):
            return jsonify({
                'success': False,
                'message': 'Đồ thị không liên thông'
            })
        

        mst = nx.minimum_spanning_tree(graph_data['graph'], algorithm='kruskal', weight='weight')
        
        mst_edges = []
        total_weight = 0
        for edge in mst.edges():
            weight = graph_data['graph'].get_edge_data(edge[0], edge[1]).get('weight', 1)
            mst_edges.append({
                'source': edge[0],
                'target': edge[1],
                'weight': weight
            })
            total_weight += weight
        
        return jsonify({
            'success': True,
            'edges': mst_edges,
            'total_weight': round(total_weight, 2),
            'message': f'Cây khung nhỏ nhất (Kruskal)\nTổng trọng số: {round(total_weight, 2)}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        })

@app.route('/api/eulerian_path', methods=['GET'])
def eulerian_path():
    
    try:
        if graph_data['graph'].number_of_nodes() == 0:
            return jsonify({
                'success': False,
                'message': 'Đồ thị rỗng'
            })
        

        if graph_data['is_directed']:

            if nx.is_eulerian(graph_data['graph']):

                path = list(nx.eulerian_circuit(graph_data['graph']))
                path_nodes = [path[0][0]] + [edge[1] for edge in path]
                return jsonify({
                    'success': True,
                    'path': path_nodes,
                    'edges': [{'source': e[0], 'target': e[1]} for e in path],
                    'is_circuit': True,
                    'algorithm': 'fleury',
                    'message': f'Chu trình Euler (Fleury): {" → ".join(path_nodes)}'
                })
            elif nx.has_eulerian_path(graph_data['graph']):

                path = list(nx.eulerian_path(graph_data['graph']))
                path_nodes = [path[0][0]] + [edge[1] for edge in path]
                return jsonify({
                    'success': True,
                    'path': path_nodes,
                    'edges': [{'source': e[0], 'target': e[1]} for e in path],
                    'is_circuit': False,
                    'algorithm': 'fleury',
                    'message': f'Đường đi Euler (Fleury): {" → ".join(path_nodes)}'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Đồ thị không có đường đi Euler'
                })
        else:

            if nx.is_eulerian(graph_data['graph']):

                path = list(nx.eulerian_circuit(graph_data['graph']))
                path_nodes = [path[0][0]] + [edge[1] for edge in path]
                return jsonify({
                    'success': True,
                    'path': path_nodes,
                    'edges': [{'source': e[0], 'target': e[1]} for e in path],
                    'is_circuit': True,
                    'algorithm': 'fleury',
                    'message': f'Chu trình Euler (Fleury): {" → ".join(path_nodes)}'
                })
            elif nx.has_eulerian_path(graph_data['graph']):

                path = list(nx.eulerian_path(graph_data['graph']))
                path_nodes = [path[0][0]] + [edge[1] for edge in path]
                return jsonify({
                    'success': True,
                    'path': path_nodes,
                    'edges': [{'source': e[0], 'target': e[1]} for e in path],
                    'is_circuit': False,
                    'algorithm': 'fleury',
                    'message': f'Đường đi Euler (Fleury): {" → ".join(path_nodes)}'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Đồ thị không có đường đi Euler'
                })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        })

@app.route('/api/hierholzer', methods=['GET'])
def hierholzer():
    
    try:
        if graph_data['graph'].number_of_nodes() == 0:
            return jsonify({
                'success': False,
                'message': 'Đồ thị rỗng'
            })
        

        if not nx.is_eulerian(graph_data['graph']):
            return jsonify({
                'success': False,
                'message': 'Hierholzer chỉ áp dụng cho chu trình Euler (tất cả đỉnh có bậc chẵn)'
            })
        

        path = list(nx.eulerian_circuit(graph_data['graph']))
        path_nodes = [path[0][0]] + [edge[1] for edge in path]
        
        return jsonify({
            'success': True,
            'path': path_nodes,
            'edges': [{'source': e[0], 'target': e[1]} for e in path],
            'is_circuit': True,
            'algorithm': 'hierholzer',
            'message': f'Chu trình Euler (Hierholzer): {" → ".join(path_nodes)}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        })

@app.route('/api/ford_fulkerson', methods=['POST'])
def ford_fulkerson():
    
    try:
        data = request.json
        source = data.get('source')
        sink = data.get('sink')
        
        if not source or not sink:
            return jsonify({
                'success': False,
                'message': 'Vui lòng chọn đỉnh nguồn (source) và đỉnh đích (sink)'
            })
        
        if source not in graph_data['graph'] or sink not in graph_data['graph']:
            return jsonify({
                'success': False,
                'message': 'Đỉnh không tồn tại trong đồ thị'
            })
        
        if source == sink:
            return jsonify({
                'success': False,
                'message': 'Đỉnh nguồn và đỉnh đích phải khác nhau'
            })
        
        if not graph_data['is_directed']:
            return jsonify({
                'success': False,
                'message': 'Ford-Fulkerson yêu cầu đồ thị có hướng'
            })
        

        flow_value, flow_dict = nx.maximum_flow(graph_data['graph'], source, sink, capacity='weight')
        

        flow_edges = []
        for u in flow_dict:
            for v in flow_dict[u]:
                if flow_dict[u][v] > 0:
                    capacity = graph_data['graph'].get_edge_data(u, v).get('weight', 1)
                    flow_edges.append({
                        'source': u,
                        'target': v,
                        'flow': round(flow_dict[u][v], 2),
                        'capacity': capacity
                    })
        
        return jsonify({
            'success': True,
            'max_flow': round(flow_value, 2),
            'flow_edges': flow_edges,
            'message': f'Luồng cực đại từ {source} đến {sink}: {round(flow_value, 2)}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        })

def _build_ascii_tree(root, order, is_bfs=True):
    
    if not order:
        return ""
    
    from collections import defaultdict, deque
    

    children = defaultdict(list)
    visited = set([root])
    
    if is_bfs:

        queue = deque([root])
        order_set = set(order)
        
        while queue:
            current = queue.popleft()

            neighbors = sorted(list(graph_data['graph'].neighbors(current)),
                             key=lambda n: (graph_data['positions'].get(n, {}).get('y', 0),
                                          graph_data['positions'].get(n, {}).get('x', 0)))
            
            for neighbor in neighbors:
                if neighbor not in visited and neighbor in order_set:
                    children[current].append(neighbor)
                    visited.add(neighbor)
                    queue.append(neighbor)
    else:

        parent_map = {root: None}
        
        def build_dfs_tree(node):
            

            neighbors = sorted(list(graph_data['graph'].neighbors(node)),
                             key=lambda n: (graph_data['positions'].get(n, {}).get('y', 0),
                                          graph_data['positions'].get(n, {}).get('x', 0)))
            for neighbor in neighbors:
                if neighbor not in visited and neighbor in order:
                    visited.add(neighbor)
                    children[node].append(neighbor)
                    parent_map[neighbor] = node
                    build_dfs_tree(neighbor)
        
        build_dfs_tree(root)
    

    lines = []
    
    def draw_tree(node, prefix="", is_last=True):
        

        connector = "└── " if is_last else "├── "

        lines.append(prefix + connector + node if prefix else node)
        

        child_list = children.get(node, [])
        for i, child in enumerate(child_list):

            is_last_child = (i == len(child_list) - 1)

            extension = "    " if is_last else "│   "
            draw_tree(child, prefix + extension, is_last_child)
    
    draw_tree(root)
    return "\n".join(lines)

if __name__ == '__main__':
    
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

