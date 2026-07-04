function orderByPriority(vendors) {
    return [...vendors].sort((a, b) => a.priority - b.priority);
}

module.exports = { orderByPriority };