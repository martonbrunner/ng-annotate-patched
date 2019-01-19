"use strict";

const os = require("os");
const convertSourceMap = require("convert-source-map");
const SourceMapConsumer = require("source-map").SourceMapConsumer;
const SourceMapGenerator = require("source-map").SourceMapGenerator;
const stableSort = require("./utils").stableSort;

class SourceMapper {
    constructor(src, nodePositions, fragments, inFile, sourceRoot) {
        this.generator = new SourceMapGenerator({ sourceRoot });
        this.src = src;
        // stableSort does not mutate input array so no need to copy it
        this.nodePositions = stableSort(nodePositions, compareLoc);
        this.fragments = stableSort(fragments, (a, b) => a.start - b.start);
        this.inFile = inFile;

        this.generator.setSourceContent(this.inFile, src);
    }

    calculateMappings() {
        // These offsets represent the difference in coordinates between a node in the source
        // and the corresponding position in the output.
        let lineOffset = 0;
        let columnOffset = 0;

        // Since the column position resets to zero after each newline, we have to keep track
        // of the current line that columnOffset refers to in order to know whether to reset it
        let currentLine = 0;

        let frag = 0;
        let pos = 0;

        while (pos < this.nodePositions.length) {
            while (frag < this.fragments.length &&
                compareLoc(this.fragments[frag].loc.start, this.nodePositions[pos]) < 1) {

                const fragmentLines = this.fragments[frag].str.split("\n");
                const addedNewlines = fragmentLines.length - 1;

                const replacedLines = this.fragments[frag].loc.end.line - this.fragments[frag].loc.start.line;
                const replacedColumns = this.fragments[frag].loc.end.column - this.fragments[frag].loc.start.column;

                // If there were any lines added by the fragment string, the line offset should increase;
                // If there were any lines removed by the fragment replacement then the line offset should decrease
                lineOffset = lineOffset + addedNewlines - replacedLines;

                // The column position needs to reset after each newline.  So if the fragment added any
                // newlines then the column offset is the difference between the column of the last line of
                // the fragment, and the column of the end of the replaced section of the source.
                // Otherwise we increment or decrement the column offset just like how the line offset works.
                // Note that "replacedColumns" might be negative in some cases (if the beginning of the source
                // was further right than the end due to a newline); the math still works out.
                columnOffset = fragmentLines.length > 1 ?
                    fragmentLines[fragmentLines.length - 1].length - this.fragments[frag].loc.end.column :
                    columnOffset + this.fragments[frag].str.length - replacedColumns;

                currentLine = this.fragments[frag].loc.end.line;

                // Skip creating mappings for any source nodes that were replaced by this fragment (and are thus
                // no longer a part of the output)
                while (pos < this.nodePositions.length &&
                    compareLoc(this.fragments[frag].loc.end, this.nodePositions[pos]) > 0) {
                    ++pos;
                }

                ++frag;
            }

            if (pos < this.nodePositions.length) {
                if (currentLine < this.nodePositions[pos].line)
                    columnOffset = 0;
                this.addMapping(this.nodePositions[pos], {
                    line: this.nodePositions[pos].line + lineOffset,
                    column: this.nodePositions[pos].column + columnOffset,
                });
                ++pos;
            }
        }
    }

    addMapping(input, output) {
        this.generator.addMapping({
            source: this.inFile,
            original: input,
            generated: output,
        });
    }

    applySourceMap(consumer) {
        this.generator.applySourceMap(consumer);
    }

    generate() {
        return this.generator.toString();
    }
}

function compareLoc(a, b) {
    return (a.line - b.line) || (a.column - b.column);
}

module.exports = function generateSourcemap(result, src, nodePositions, fragments, mapOpts) {
    const existingMap = convertSourceMap.fromSource(src);
    const existingMapObject = existingMap && existingMap.toObject();
    const inFile = (existingMapObject && existingMapObject.file) || mapOpts.inFile || "source.js";
    const sourceRoot = (existingMapObject && existingMapObject.sourceRoot) || mapOpts.sourceRoot;
    src = convertSourceMap.removeMapFileComments(src);

    const mapper = new SourceMapper(src, nodePositions, fragments, inFile, sourceRoot);
    mapper.calculateMappings();

    if (mapOpts.inline) {
        if (existingMapObject)
            mapper.applySourceMap(new SourceMapConsumer(existingMapObject));

        result.src = convertSourceMap.removeMapFileComments(result.src) +
            os.EOL +
            convertSourceMap.fromJSON(mapper.generate()).toComment();
    } else {
        result.map = mapper.generate();
    }
};
