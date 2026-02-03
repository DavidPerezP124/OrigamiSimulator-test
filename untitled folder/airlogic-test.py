import matplotlib.pyplot as plt
import networkx as nx
from dataclasses import dataclass
from typing import List, Dict

class AirLogicNode:
    """
    A node in an air-logic network that self-registers globally.
    It has a fluent API for setting outputs, pick behavior, and colors.
    """

    # ----------------------------------------------------------------------
    # True class-level registries (static dictionaries) shared by all nodes
    # ----------------------------------------------------------------------
    NODES: Dict[str, "AirLogicNode"] = {}
    CONNECTIONS: Dict[str, List[str]] = {}

    # A dictionary storing the most recent output state of each node
    # (used by the time-step simulation).
    node_outputs: Dict[str, bool] = {}

    def __init__(self, node_id=None, logic_type="BUFFER", switch_state=True):
        self.node_id = node_id
        self.logic_type = logic_type
        self.switch_state = switch_state  # relevant if logic_type == "SWITCH"
        self.input_value = False          # used if logic_type == "INPUT"
        self.onpick_behavior = "default"
        
        # Default colors
        self.active_color = "green"
        self.inactive_color = "red"
        self.neutral_color = "lightblue"  # for non-switch nodes

        # Automatically register this node
        if self.node_id is None:
            self.node_id = f"Node{len(AirLogicNode.NODES) + 1}"
        AirLogicNode.NODES[self.node_id] = self

    def evaluate(self, inputs: List[bool]) -> bool:
        """
        Minimal logic: use the logic_type to determine output from inputs.
        """
        if self.logic_type == "NOT":
            return not inputs[0]
        elif self.logic_type == "AND":
            return all(inputs)
        elif self.logic_type == "OR":
            return any(inputs)
        elif self.logic_type == "XOR":
            # XOR for multiple inputs = True if an odd number of True inputs
            return (sum(inputs) % 2 == 1)
        elif self.logic_type == "INPUT":
            # Always return self.input_value if it's an INPUT node
            return self.input_value
        elif self.logic_type == "SWITCH":
            # Switch passes its input if ON, else output is False
            return inputs[0] if self.switch_state else False
        # Default / BUFFER:
        return inputs[0]

    def outputs(self, *others: "AirLogicNode"):
        """
        Fluent method: connect this node as source → each node in 'others'.
        """
        if self.node_id not in AirLogicNode.CONNECTIONS:
            AirLogicNode.CONNECTIONS[self.node_id] = []
        for target_node in others:
            AirLogicNode.CONNECTIONS[self.node_id].append(target_node.node_id)
        return self

    def set_input_value(self, val: bool):
        """
        Set the external input for an INPUT node.
        """
        self.input_value = val
        return self

    def onPick(self, behavior="default"):
        """
        Fluent method: define behavior for on-click picking (currently only toggling).
        """
        self.onpick_behavior = behavior
        return self

    def active(self, color: str):
        """
        Fluent method: color used for 'SWITCH' nodes that are ON.
        """
        self.active_color = color
        return self

    def inactive(self, color: str):
        """
        Fluent method: color used for 'SWITCH' nodes that are OFF.
        """
        self.inactive_color = color
        return self

    @classmethod
    def visualize(cls):
        """
        Builds a NetworkX graph from the class-level registries
        and displays it with clickable SWITCH nodes.
        """
        G = nx.DiGraph()

        # 1) Add all known nodes
        for node_id, node_obj in cls.NODES.items():
            G.add_node(node_id, label=f"{node_id}\n({node_obj.logic_type})")
            # Initialize node_outputs with a guess or default
            cls.node_outputs[node_id] = False

        # 2) Add edges
        for src, targets in cls.CONNECTIONS.items():
            for tgt in targets:
                G.add_edge(src, tgt)

        # 3) Build a stable nodelist & color them
        nodelist = sorted(G.nodes())
        node_colors = []
        for nid in nodelist:
            nobj = cls.NODES[nid]
            if nobj.logic_type == "SWITCH":
                node_colors.append(nobj.active_color if nobj.switch_state else nobj.inactive_color)
            else:
                node_colors.append(nobj.neutral_color)

        # We store these for re-use in the step-based simulation
        cls._graph = G
        cls._pos = nx.spring_layout(G, seed=42)
        cls._nodelist = nodelist

        ax = plt.gca()
        nodes = nx.draw_networkx_nodes(
            G,
            cls._pos,
            nodelist=nodelist,
            node_color=node_colors,
            node_size=3000,
            ax=ax
        )
        nodes.set_picker(True)

        nx.draw_networkx_edges(G, cls._pos, ax=ax)
        labels = {n: G.nodes[n]["label"] for n in G.nodes()}
        nx.draw_networkx_labels(G, cls._pos, labels=labels, ax=ax)

        cls._node_patches = nodes  # The single PathCollection for all nodes

        fig = plt.gcf()
        # We connect 'pick_event' to a callback
        fig.canvas.mpl_connect('pick_event',
            lambda e: cls._on_click_event(e, nodelist, ax)
        )

        plt.title("AirLogicNodes Visualization")
        plt.show()

    @classmethod
    def _on_click_event(cls, event, nodelist, axis):
        """
        Called whenever a user clicks on a node.
        If it's a SWITCH with default pick behavior, toggle it,
        then simulate the network for 1 or more steps.
        """
        if not hasattr(event, 'ind') or len(event.ind) == 0:
            return
        idx = event.ind[0]
        if idx >= len(nodelist):
            return

        node_id = nodelist[idx]
        node_obj = cls.NODES[node_id]

        # Toggle the switch if it's a SWITCH
        if node_obj.logic_type == "SWITCH" and node_obj.onpick_behavior == "default":
            node_obj.switch_state = not node_obj.switch_state

        # Now run a short simulation (e.g., 5 steps) to see the updated states
        cls._simulate_and_recolor(axis, steps=5)

    @classmethod
    def _simulate_and_recolor(cls, axis, steps=5):
        """
        A simple iterative logic simulation that can handle cycles.
        We repeat 'steps' times:
          1) For each node, gather parent outputs from the *current* state.
          2) Evaluate the node.
          3) Update the node's color in the existing PathCollection.
          4) Update edges to highlight True signals in yellow, else gray.
        """
        import time
        import matplotlib.colors as mcolors

        graph = cls._graph
        pos = cls._pos
        nodelist = cls._nodelist
        node_patches = cls._node_patches

        ax = axis
        
        for _ in range(steps):
            # 1) We'll build a new dict for next iteration's outputs
            new_outputs = {}

            # Clear old edges & redraw them all in gray
            for c in list(ax.collections):
                if c is not node_patches:
                    c.remove()
            nx.draw_networkx_edges(graph, pos, ax=ax, edge_color="gray")

            # 2) Evaluate each node based on parent's *current* states (cls.node_outputs)
            for node_id in nodelist:
                node_obj = cls.NODES[node_id]
                parents = list(graph.predecessors(node_id))
                parent_vals = [cls.node_outputs[p] for p in parents]
                
                # Evaluate using current parent's outputs
                out_val = node_obj.evaluate(parent_vals)
                new_outputs[node_id] = out_val

            # 3) Update facecolors & highlight edges
            facecolors = node_patches.get_facecolors()

            for node_id, out_val in new_outputs.items():
                idx = nodelist.index(node_id)
                color_rgba = mcolors.to_rgba("green" if out_val else "red")
                facecolors[idx] = color_rgba

            node_patches.set_facecolors(facecolors)

            # highlight edges that carry True
            for src, tgt in graph.edges():
                if new_outputs.get(src, False):
                    nx.draw_networkx_edges(graph, pos, edgelist=[(src,tgt)],
                                           edge_color="yellow", width=3, ax=ax)

            # 4) Update the global node_outputs for next iteration
            cls.node_outputs = new_outputs

            # Redraw and pause briefly so user sees the changes
            ax.figure.canvas.draw()
            plt.pause(0.5)  # adjust if you want faster/slower updates


# ---------------------------------------------------------------------
# Example usage
# ---------------------------------------------------------------------
if __name__ == "__main__":
    # Clear old data
    AirLogicNode.NODES.clear()
    AirLogicNode.CONNECTIONS.clear()
    AirLogicNode.node_outputs.clear()

    # Two switches for the "metronome" sides
    sideA = AirLogicNode("sideA", logic_type="SWITCH").onPick("default")
    sideB = AirLogicNode("sideB", logic_type="SWITCH").onPick("default")

    # Two NOT gates for cross-coupling
    notA = AirLogicNode("notA", logic_type="NOT")
    notB = AirLogicNode("notB", logic_type="NOT")

    # NEW: an INPUT node set to True
    node_in = AirLogicNode("In", logic_type="INPUT").set_input_value(True)

    # Cross connections for the metronome:
    # sideA -> notB -> sideB
    # sideB -> notA -> sideA
    sideA.outputs(notB)
    notB.outputs(sideB)
    sideB.outputs(notA)
    notA.outputs(sideA)

    # Instead of feeding input into a SWITCH:
    # feed the input to, say, `notA`.
    node_in.outputs(notA)

    # Optionally initialize one side as ON
    sideA.switch_state = True
    sideB.switch_state = False

    AirLogicNode.visualize()