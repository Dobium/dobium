"""
DOBIUM - Data Store Utilities
JSON file-based data storage for prediction markets
"""

import json
import os
from typing import Any, List

def read_json(file_path: str) -> List[Any]:
    """
    Read JSON data from file
    
    Args:
        file_path: Path to the JSON file
        
    Returns:
        List of data from the file, or empty list if file doesn't exist
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def write_json(file_path: str, data: List[Any]) -> None:
    """
    Write JSON data to file
    
    Args:
        file_path: Path to the JSON file
        data: Data to write
    """
    # Ensure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def append_to_json(file_path: str, item: Any) -> None:
    """
    Append an item to a JSON array file
    
    Args:
        file_path: Path to the JSON file
        item: Item to append
    """
    data = read_json(file_path)
    data.append(item)
    write_json(file_path, data)

def update_in_json(file_path: str, item_id: str, updates: dict, id_field: str = 'id') -> bool:
    """
    Update an item in a JSON array file
    
    Args:
        file_path: Path to the JSON file
        item_id: ID of the item to update
        updates: Dictionary of fields to update
        id_field: Name of the ID field
        
    Returns:
        True if item was found and updated, False otherwise
    """
    data = read_json(file_path)
    
    for item in data:
        if item.get(id_field) == item_id:
            item.update(updates)
            write_json(file_path, data)
            return True
    
    return False

def delete_from_json(file_path: str, item_id: str, id_field: str = 'id') -> bool:
    """
    Delete an item from a JSON array file
    
    Args:
        file_path: Path to the JSON file
        item_id: ID of the item to delete
        id_field: Name of the ID field
        
    Returns:
        True if item was found and deleted, False otherwise
    """
    data = read_json(file_path)
    original_length = len(data)
    
    data = [item for item in data if item.get(id_field) != item_id]
    
    if len(data) < original_length:
        write_json(file_path, data)
        return True
    
    return False

def find_in_json(file_path: str, item_id: str, id_field: str = 'id') -> Any:
    """
    Find an item in a JSON array file
    
    Args:
        file_path: Path to the JSON file
        item_id: ID of the item to find
        id_field: Name of the ID field
        
    Returns:
        The item if found, None otherwise
    """
    data = read_json(file_path)
    return next((item for item in data if item.get(id_field) == item_id), None)
