'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import * as d3 from 'd3';
import { Companion } from '@/types';

interface CompanionNode extends Companion {
  x: number;
  y: number;
  r: number;
}

export function CompanionMap() {
  const { state } = useApp();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 120;
    const height = 120;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 40;

    // Clear previous content
    svg.selectAll('*').remove();

    // Set up the SVG
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Create radial layout
    const companions = state.companions.slice(0, 8); // Limit to 8 for mini-map
    const angleStep = (2 * Math.PI) / companions.length;

    const nodes: CompanionNode[] = companions.map((companion, i) => ({
      ...companion,
      x: centerX + radius * Math.cos(i * angleStep - Math.PI / 2),
      y: centerY + radius * Math.sin(i * angleStep - Math.PI / 2),
      r: companion.id === state.activeCompanion ? 12 : 8
    }));

    // Personality color mapping
    const personalityColors = {
      friendly: '#4CAF50',
      professional: '#2196F3',
      humorous: '#FF9800',
      serious: '#9C27B0'
    };

    // Create links from center to nodes (optional visual connections)
    const links = nodes.map(node => ({
      source: { x: centerX, y: centerY },
      target: node
    }));

    // Draw connection lines
    svg.selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3)
      .attr('stroke-dasharray', d => d.target.id === state.activeCompanion ? 'none' : '2,2');

    // Draw companion nodes
    const nodeGroups = svg.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // Add circles for companions
    nodeGroups
      .append('circle')
      .attr('r', d => d.r)
      .attr('fill', d => personalityColors[d.personality])
      .attr('stroke', d => d.id === state.activeCompanion ? '#ffffff' : 'none')
      .attr('stroke-width', d => d.id === state.activeCompanion ? 2 : 0)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('r', d => (d as CompanionNode).r * 1.2);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8)
          .attr('r', d => (d as CompanionNode).r);
      });

    // Add avatars/emojis
    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', d => d.id === state.activeCompanion ? '14px' : '10px')
      .attr('fill', '#ffffff')
      .style('pointer-events', 'none')
      .text(d => d.avatar);

    // Add tooltips
    nodeGroups
      .append('title')
      .text(d => `${d.name} (${d.personality})`);

    // Add center indicator
    svg.append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', 4)
      .attr('fill', '#ffffff')
      .attr('opacity', 0.6);

    // Add center label
    svg.append('text')
      .attr('x', centerX)
      .attr('y', centerY + 1)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('fill', '#ffffff')
      .attr('opacity', 0.8)
      .text('AI');

  }, [state.companions, state.activeCompanion]);

  return (
    <div className="companion-map">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ maxWidth: '120px', maxHeight: '120px' }}
      />
      <div className="text-xs text-gray-400 text-center mt-1">
        {state.companions.length} Active AIs
      </div>
    </div>
  );
}