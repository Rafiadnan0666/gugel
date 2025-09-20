'use client';
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { FiArrowRight, FiExternalLink, FiGithub, FiMenu, FiX } from 'react-icons/fi';
import Image from 'next/image';


export default function LandingPage() {
  return (
    <div>
      <Head>
        <title>Landing Page</title>
      </Head>
      <main>
        <h1>Welcome to the Landing Page</h1>
        <Image src="/path/to/image.jpg" alt="Description" width={500} height={300} />
      </main>
    </div>
  );
}